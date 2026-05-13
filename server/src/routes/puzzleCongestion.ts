// PUZZLE (SK Open API) 칸별 혼잡도 라우트
// GET /api/puzzle/car-congestion/:stationName?line=N
//
// 응답: 현재 시간대 + 방향별 정규화된 데이터
//   - 방면별 칸 10개 혼잡도 %
//   - 가장 한산한 칸 추천
//   - 시간대 라벨 (예: "퇴근시간 19:00")
//
// 백엔드에서 PUZZLE raw 응답을 가공해서 앱이 바로 쓸 수 있게 변환.
// 분당 호출 한도 보호 위해 인메모리 5분 캐시 적용 (같은 역).

import { Router, Request, Response } from "express";
import { getCarCongestion, PuzzleStatRow } from "../services/puzzle/client";
import { findStationByName, type LineKey } from "../data/lineStationCodes";
import { ApiResponse } from "../../../shared/types/metro";

const router = Router();

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, timestamp: new Date().toISOString() };
}
function fail(code: string, message: string): ApiResponse<never> {
  return {
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// 인메모리 캐시 (12시간) — PUZZLE 통계 데이터는 요일+시간 단위로 거의 안 바뀜
//   - 키: `${stationCode}_${dow}_${hh}` (예: "226_TUE_21")
//   - hh 가 바뀌면 자동 새 키 → 1시간마다 새로 SK 호출
//   - 같은 dow+hh 안에선 12시간 보존 (월 호출 한도 보호)
// ─────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
interface CacheEntry {
  data: NormalizedCarCongestion;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

// ─────────────────────────────────────────────────────────────
// 정규화 타입 (앱이 바로 쓰는 포맷)
// ─────────────────────────────────────────────────────────────

export interface NormalizedCarCongestion {
  stationName: string;
  stationCode: string;
  subwayLine: string;
  /** 현재 시간 (KST) — 사용된 시간대 라벨 */
  time: string; // "19:00"
  hourLabel: string; // "퇴근시간"
  /** 두 방면 (외선/내선 또는 상행/하행) */
  directions: DirectionCongestion[];
  /** 종착역별 칸 데이터 — 다음 도착 열차의 종착과 매칭해서 정확한 칸 정보 표시.
   *  key: 정리된 종착역 이름 (예: "성수", "잠실", "신도림"). "역" / "(R)" / 괄호 제거.
   *  서울 API 도착정보의 bstatnNm 도 같은 방식으로 정리 → 직접 매칭. */
  byDestination: Record<string, DestinationCongestion>;
  /** 가장 한산한 방면 추천 (양 방면 평균 비교) */
  recommended?: {
    direction: 0 | 1;
    directionLabel: string;
    bestCarNo: number; // 1~10
    bestCongestion: number;
    reason: string;
  };
}

/**
 * 특정 종착역으로 가는 열차의 칸 정보 (PUZZLE stat[] row 들의 종착역별 그룹 평균)
 */
export interface DestinationCongestion {
  endStationName: string; // 원본 그대로 (예: "성수역")
  endStationCode: string;
  updnLine: 0 | 1;
  directionLabel: string;
  cars: number[]; // 1~10 칸 혼잡도 %
  avgCongestion: number;
  bestCarNo: number;
  bestCongestion: number;
  /** 평균에 합쳐진 stat row 개수 (디버그) */
  rowCount: number;
}

export interface DirectionCongestion {
  updnLine: 0 | 1;
  /** 한국어 라벨: "외선" / "내선" / "상행" / "하행" */
  directionLabel: string;
  /** 1~10칸 혼잡도 % (여러 stat 평균) */
  cars: number[];
  /** 전체 칸 평균 */
  avgCongestion: number;
  /** 가장 한산한 칸 번호 (1~10) */
  bestCarNo: number;
  /** 가장 한산한 칸 혼잡도 */
  bestCongestion: number;
}

// ─────────────────────────────────────────────────────────────
// 시간 라벨링 (KST)
// ─────────────────────────────────────────────────────────────

function getKstNow(): {
  hh: string;
  mm: string;
  hourLabel: string;
  dow: string;
} {
  const now = new Date();
  // UTC + 9 시간 = KST
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  // 10분 단위로 내림 (PUZZLE 데이터 10분 단위)
  const minute = kst.getUTCMinutes();
  const mm = String(Math.floor(minute / 10) * 10).padStart(2, "0");
  // 요일 — 캐시 키 분리용 (PUZZLE 통계는 dow별 평균)
  const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][kst.getUTCDay()];

  const hourNum = parseInt(hh, 10);
  let hourLabel = "";
  if (hourNum >= 7 && hourNum < 10) hourLabel = "출근시간";
  else if (hourNum >= 17 && hourNum < 20) hourLabel = "퇴근시간";
  else if (hourNum >= 11 && hourNum < 14) hourLabel = "점심시간";
  else if (hourNum >= 22 || hourNum < 6) hourLabel = "심야시간";
  else hourLabel = "일반시간";

  return { hh, mm, hourLabel, dow };
}

// ─────────────────────────────────────────────────────────────
// 호선별 방면 라벨
// ─────────────────────────────────────────────────────────────

function getDirectionLabel(line: string, updnLine: 0 | 1): string {
  // 2호선 = 순환선
  if (line === "2호선") {
    return updnLine === 0 ? "외선" : "내선";
  }
  return updnLine === 0 ? "하행" : "상행";
}

// ─────────────────────────────────────────────────────────────
// PUZZLE 응답 → 정규화
// ─────────────────────────────────────────────────────────────

function normalize(
  raw: Awaited<ReturnType<typeof getCarCongestion>>,
  now: ReturnType<typeof getKstNow>
): NormalizedCarCongestion {
  const { contents } = raw;
  const stats = contents.stat;

  // 방면(updnLine)별로 그룹핑 + 각 칸 평균
  const grouped: Record<0 | 1, PuzzleStatRow[]> = { 0: [], 1: [] };
  for (const row of stats) {
    grouped[row.updnLine].push(row);
  }

  const directions: DirectionCongestion[] = [];
  for (const updn of [0, 1] as const) {
    const rows = grouped[updn];
    if (rows.length === 0) continue;

    // 각 row 에서 현재 시간대 또는 가장 가까운 시간대 찾기
    // 10칸 혼잡도 배열을 모두 모아서 평균
    const carSums = new Array(10).fill(0);
    let validCount = 0;

    for (const row of rows) {
      const bucket = pickTimeBucket(row.data, now.hh, now.mm);
      if (!bucket || !Array.isArray(bucket.congestionCar)) continue;
      for (let i = 0; i < 10; i++) {
        carSums[i] += bucket.congestionCar[i] ?? 0;
      }
      validCount++;
    }

    if (validCount === 0) continue;

    const cars = carSums.map((sum) => Math.round(sum / validCount));
    // 9호선/일부 1호선은 6량/8량 편성 → 미운행 칸이 0% 로 옴.
    // 평균/최저 계산 시 0 은 "운행 X" 로 보고 제외.
    const operatingCars = cars
      .map((c, idx) => ({ c, carNo: idx + 1 }))
      .filter((x) => x.c > 0);
    const avgCongestion =
      operatingCars.length > 0
        ? Math.round(
            operatingCars.reduce((a, b) => a + b.c, 0) / operatingCars.length
          )
        : 0;
    let bestCarNo = 1;
    let bestCongestion = 0;
    if (operatingCars.length > 0) {
      const best = operatingCars.reduce((a, b) => (a.c <= b.c ? a : b));
      bestCarNo = best.carNo;
      bestCongestion = best.c;
    }

    directions.push({
      updnLine: updn,
      directionLabel: getDirectionLabel(contents.subwayLine, updn),
      cars,
      avgCongestion,
      bestCarNo,
      bestCongestion,
    });
  }

  // 추천 — 양 방면 중 더 한산한 쪽
  let recommended: NormalizedCarCongestion["recommended"] = undefined;
  if (directions.length === 2) {
    const sorted = [...directions].sort(
      (a, b) => a.avgCongestion - b.avgCongestion
    );
    const best = sorted[0];
    recommended = {
      direction: best.updnLine,
      directionLabel: best.directionLabel,
      bestCarNo: best.bestCarNo,
      bestCongestion: best.bestCongestion,
      reason: `${best.directionLabel} ${best.bestCarNo}번 칸이 가장 한산해요 (${best.bestCongestion}%)`,
    };
  } else if (directions.length === 1) {
    const only = directions[0];
    recommended = {
      direction: only.updnLine,
      directionLabel: only.directionLabel,
      bestCarNo: only.bestCarNo,
      bestCongestion: only.bestCongestion,
      reason: `${only.bestCarNo}번 칸이 가장 한산해요 (${only.bestCongestion}%)`,
    };
  }

  // 종착역별 그룹핑 — 다음 도착 열차의 종착과 매칭하기 위해
  const byDestination = groupByDestination(stats, now, contents.subwayLine);

  return {
    stationName: contents.stationName,
    stationCode: contents.stationCode,
    subwayLine: contents.subwayLine,
    time: `${now.hh}:${now.mm}`,
    hourLabel: now.hourLabel,
    directions,
    byDestination,
    recommended,
  };
}

/**
 * 종착역 이름 정리 — 매칭용 키
 * "성수역" → "성수"
 * "성수역(R)" → "성수" (지선 종착)
 * "사당역" → "사당"
 */
function cleanDestKey(name: string): string {
  return name
    .replace(/\(.*\)/g, "")  // 괄호 안 제거
    .replace(/역$/, "")       // 끝의 "역" 제거
    .trim();
}

function groupByDestination(
  stats: PuzzleStatRow[],
  now: ReturnType<typeof getKstNow>,
  subwayLine: string
): Record<string, DestinationCongestion> {
  // endStation 키별로 row 그룹
  const groups = new Map<string, PuzzleStatRow[]>();
  for (const row of stats) {
    const key = cleanDestKey(row.endStationName);
    if (!key) continue;
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }

  const out: Record<string, DestinationCongestion> = {};
  for (const [key, rows] of groups.entries()) {
    const carSums = new Array(10).fill(0);
    let validCount = 0;
    // updnLine은 같은 종착이면 같음 가정 (다르면 첫 row 기준)
    const updnLine = rows[0].updnLine;
    for (const row of rows) {
      const bucket = pickTimeBucket(row.data, now.hh, now.mm);
      if (!bucket || !Array.isArray(bucket.congestionCar)) continue;
      for (let i = 0; i < 10; i++) {
        carSums[i] += bucket.congestionCar[i] ?? 0;
      }
      validCount++;
    }
    if (validCount === 0) continue;
    const cars = carSums.map((s) => Math.round(s / validCount));
    // 운행 칸만 (0은 미운행) — directions 와 동일 로직
    const operatingCars = cars
      .map((c, idx) => ({ c, carNo: idx + 1 }))
      .filter((x) => x.c > 0);
    const avgCongestion =
      operatingCars.length > 0
        ? Math.round(
            operatingCars.reduce((a, b) => a + b.c, 0) / operatingCars.length
          )
        : 0;
    let bestCarNo = 1;
    let bestCongestion = 0;
    if (operatingCars.length > 0) {
      const best = operatingCars.reduce((a, b) => (a.c <= b.c ? a : b));
      bestCarNo = best.carNo;
      bestCongestion = best.c;
    }
    out[key] = {
      endStationName: rows[0].endStationName, // 원본 (예: "성수역")
      endStationCode: rows[0].endStationCode,
      updnLine,
      directionLabel: getDirectionLabel(subwayLine, updnLine),
      cars,
      avgCongestion,
      bestCarNo,
      bestCongestion,
      rowCount: validCount,
    };
  }

  return out;
}

/**
 * 현재 시간대 bucket 찾기. 없으면 같은 hh 내 가까운 mm, 그것도 없으면 첫 번째.
 */
function pickTimeBucket(
  data: { hh: string; mm: string; congestionCar: number[] }[],
  hh: string,
  mm: string
) {
  // 정확히 hh:mm 매치
  const exact = data.find((d) => d.hh === hh && d.mm === mm);
  if (exact) return exact;
  // 같은 hh 내 첫 매치
  const sameHour = data.find((d) => d.hh === hh);
  if (sameHour) return sameHour;
  // 첫 번째 fallback
  return data[0];
}

// ─────────────────────────────────────────────────────────────
// 라우트
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/puzzle/car-congestion/:stationName?line=N
 *
 * - stationName: 한글 역 이름 (예: "강남")
 * - line: 호선 (1~9). 환승역 모호성 해소용.
 *
 * findStationByName 으로 stationName → stinCd 변환 후 PUZZLE 호출.
 */
router.get("/car-congestion/:stationName", async (req: Request, res: Response) => {
  const stationName = req.params.stationName;
  const line = typeof req.query.line === "string" ? req.query.line : undefined;

  if (!stationName || stationName.trim() === "") {
    return res.status(400).json(fail("INVALID_STATION", "역 이름이 비어있어요"));
  }

  // stinCd lookup (KRIC code 와 동일). line 은 string→LineKey 안전 캐스팅 (1~9만 통과)
  const lineKey: LineKey | undefined =
    line && /^[1-9]$/.test(line) ? (line as LineKey) : undefined;
  const stationInfo = findStationByName(stationName, lineKey);
  if (!stationInfo) {
    return res
      .status(404)
      .json(fail("STATION_NOT_FOUND", `${stationName} 역 정보를 못 찾았어요`));
  }
  // PUZZLE 은 stationCode 의 앞 0 없이 받음 (9호선 "0901" → "901")
  // 다른 호선은 영향 없음 (1호선 "150", 2호선 "222" 등 이미 0 없음)
  const stationCode = stationInfo.stinCd.replace(/^0+/, "");

  // 캐시 키 = ${stationCode}_${dow}_${hh}
  // dow/hh 별로 분리 → 시간대 흐름에 따라 새 데이터 받음, 같은 dow+hh 는 12시간 캐시
  const now = getKstNow();
  const cacheKey = `${stationCode}_${now.dow}_${now.hh}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(
      `[puzzle.routes] 캐시 hit: ${stationName} ${cacheKey}`
    );
    return res.json(ok(cached.data));
  }

  try {
    const raw = await getCarCongestion(stationCode);
    const normalized = normalize(raw, now);
    cache.set(cacheKey, {
      data: normalized,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return res.json(ok(normalized));
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[puzzle.routes] carCongestion error:", message);
    return res.status(502).json(fail("UPSTREAM_ERROR", message));
  }
});

export default router;
