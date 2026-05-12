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
// 인메모리 캐시 (5분) — PUZZLE 데이터는 통계라 자주 갱신 불필요
// ─────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000;
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
  /** 가장 한산한 방면 추천 (양 방면 평균 비교) */
  recommended?: {
    direction: 0 | 1;
    directionLabel: string;
    bestCarNo: number; // 1~10
    bestCongestion: number;
    reason: string;
  };
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

function getKstNow(): { hh: string; mm: string; hourLabel: string } {
  const now = new Date();
  // UTC + 9 시간 = KST
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  // 10분 단위로 내림 (PUZZLE 데이터 10분 단위)
  const minute = kst.getUTCMinutes();
  const mm = String(Math.floor(minute / 10) * 10).padStart(2, "0");

  const hourNum = parseInt(hh, 10);
  let hourLabel = "";
  if (hourNum >= 7 && hourNum < 10) hourLabel = "출근시간";
  else if (hourNum >= 17 && hourNum < 20) hourLabel = "퇴근시간";
  else if (hourNum >= 11 && hourNum < 14) hourLabel = "점심시간";
  else if (hourNum >= 22 || hourNum < 6) hourLabel = "심야시간";
  else hourLabel = "일반시간";

  return { hh, mm, hourLabel };
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
    const avgCongestion = Math.round(
      cars.reduce((a, b) => a + b, 0) / cars.length
    );
    let bestCarNo = 1;
    let bestCongestion = cars[0];
    for (let i = 1; i < cars.length; i++) {
      if (cars[i] < bestCongestion) {
        bestCongestion = cars[i];
        bestCarNo = i + 1;
      }
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

  return {
    stationName: contents.stationName,
    stationCode: contents.stationCode,
    subwayLine: contents.subwayLine,
    time: `${now.hh}:${now.mm}`,
    hourLabel: now.hourLabel,
    directions,
    recommended,
  };
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
  const stationCode = stationInfo.stinCd;

  // 캐시 키 = stationCode (호선별로 stinCd 다름)
  const cacheKey = stationCode;
  const cached = cache.get(cacheKey);
  const now = getKstNow();
  if (cached && cached.expiresAt > Date.now()) {
    // 캐시 hit — 다만 시간이 바뀌었으면 정규화 다시 (raw 보존 안 함 — 간단화)
    console.log(`[puzzle.routes] 캐시 hit: ${stationName} (${stationCode})`);
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
