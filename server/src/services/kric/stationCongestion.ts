// 레일포털 — 역사별 혼잡도 (서울교통공사)
// service: convenientInfo / operation: stationCongestion
// 키: KRIC_STATION_CONGESTION_KEY
//
// 데이터 성격:
//   - 실시간 X — 분기별 시간대 평균 (예: "2026-1/4 07:30")
//   - 39개 시간대(05:30~24:30 30분 단위) × N개 승강장(plfNo) × M개 측정구역(stinFlorDvCd)
//   - "열차객실(04)" 외에 일부 역엔 대합실/통로 등 다른 측정구역도 존재
//   - 칸별 데이터는 없음 — 칸별 추천은 trainEnvironment API에서 별도 시도 예정
//
// 정규화: raw 78건 → 두 방향 × 시간대 39슬롯 + 현재 시각 자동 선택

import { callKric } from "./client";
import {
  classifyHour,
  extractQuarter,
  extractTime,
  HourLabel,
  nearestSlot,
} from "./timeSlot";

// ─────────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────────

export interface StationCongestionQuery {
  /** 운영기관 코드 — 서울교통공사: 'S1' (기본) */
  railOprIsttCd?: string;
  /** 노선 코드 — 4호선: '4' */
  lnCd: string | number;
  /** 역사 코드 (예: 사당 433) */
  stinCd: string | number;
}

/** KRIC 응답 1건 (raw) */
interface RawCongestionItem {
  railOprIsttCd: string;
  lnCd: string;
  stinCd: string;
  stinFlorDvCd: string;   // "04"=열차객실, 외 다른 코드도 있을 수 있음
  stinFlorDvNm: string;   // "열차객실"
  plfNo: number;          // 1=상행, 2=하행 (사당 기준 — 다른 역은 platform API로 검증 필요)
  msmtDttm: string;       // "2026-1/4 07:30"
  grndDvCd: string | null;
  grndDvNm: string | null;
  stinFlor: number | null;
  stinLofa: number;       // 측정값 (m²당 인원수 또는 혼잡 %)
}

/** 5단계 혼잡도 레벨 */
export type CongestionLevel = "very_low" | "low" | "medium" | "high" | "very_high";

/** 라벨 (한국어) */
export type CongestionLabel = "여유" | "한산" | "보통" | "혼잡" | "매우 혼잡";

export interface NormalizedTimeSlot {
  /** "07:30" */
  time: string;
  /** "출근시간" | "오전" | ... */
  hourLabel: HourLabel;
  /** 원본 측정값 */
  stinLofa: number;
  /** 5단계 레벨 */
  level: CongestionLevel;
  /** 한국어 라벨 */
  label: CongestionLabel;
}

export interface NormalizedDirection {
  plfNo: number;
  /** "상행" | "하행" — 다른 역은 platform API로 검증 후 보강 예정 */
  directionLabel: string;
  /** 측정 구역 (현재는 "열차객실" 한 종류만 노출) */
  measureArea: string;
  /** 39개 시간대 슬롯 (시각 순) */
  timeSlots: NormalizedTimeSlot[];
}

export interface NormalizedCurrent {
  /** 현재 또는 지정 시각 (예: "08:00") */
  time: string;
  hourLabel: HourLabel;
  /** 양 방향의 현재 시각 데이터 */
  directions: {
    plfNo: number;
    directionLabel: string;
    stinLofa: number;
    level: CongestionLevel;
    label: CongestionLabel;
  }[];
  /** 두 방향 중 더 한산한 쪽 추천 (참고) */
  recommended: {
    plfNo: number;
    directionLabel: string;
    label: CongestionLabel;
    reason: string;
  } | null;
}

export interface NormalizedStationCongestion {
  stinCd: string;
  lnCd: string;
  /** 데이터 분기 (예: "2026-1/4") */
  quarter: string;
  /** 방향별 시간대 데이터 */
  directions: NormalizedDirection[];
  /** 요청 시각(또는 nowSlot) 기준 현재 슬롯 */
  current: NormalizedCurrent;
  /** 응답 생성 시각 */
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────
// 정규화 로직
// ─────────────────────────────────────────────────────────────────

/**
 * stinLofa 값 → 5단계 레벨
 * 임계값은 사당역 출근시간 평균(~46)을 medium 상단으로 잡아 보정.
 * 추후 더 많은 역 데이터 모이면 분포 기반으로 재조정 가능.
 */
function levelOf(stinLofa: number): CongestionLevel {
  if (stinLofa < 10) return "very_low";
  if (stinLofa < 30) return "low";
  if (stinLofa < 50) return "medium";
  if (stinLofa < 70) return "high";
  return "very_high";
}

function labelOf(level: CongestionLevel): CongestionLabel {
  switch (level) {
    case "very_low": return "여유";
    case "low": return "한산";
    case "medium": return "보통";
    case "high": return "혼잡";
    case "very_high": return "매우 혼잡";
  }
}

/**
 * Phase 1: plfNo → 방향 매핑 (사당역 기준)
 * - plfNo 1 = 상행(당고개행), plfNo 2 = 하행(오이도행) — 사당 platform 응답 검증됨
 * - 다른 역은 platform API로 검증 후 보강 예정
 */
function directionLabelOf(plfNo: number): string {
  if (plfNo === 1) return "상행";
  if (plfNo === 2) return "하행";
  return `승강장 ${plfNo}`;
}

/**
 * raw 응답을 정규화
 *
 * @param raw       KRIC 응답 raw
 * @param targetTime  현재 시각으로 사용할 슬롯 (생략 시 now 기준 nearestSlot)
 */
export function normalize(
  raw: { header: any; body: RawCongestionItem[] },
  targetTime?: string
): NormalizedStationCongestion {
  const body = raw.body ?? [];
  if (body.length === 0) {
    throw new Error("이 역은 아직 정보가 없어요");
  }

  const sample = body[0];
  const quarter = extractQuarter(sample.msmtDttm);
  const slotTarget = targetTime ?? nearestSlot();

  // plfNo 별로 그룹핑 + 시각 순 정렬
  const byPlf = new Map<number, RawCongestionItem[]>();
  for (const r of body) {
    if (!byPlf.has(r.plfNo)) byPlf.set(r.plfNo, []);
    byPlf.get(r.plfNo)!.push(r);
  }

  const directions: NormalizedDirection[] = Array.from(byPlf.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([plfNo, items]) => {
      // 시각 순 정렬 (24:00, 24:30이 23:59보다 뒤로 가도록 문자열 비교 OK — 둘 다 "HH:MM")
      items.sort((a, b) => extractTime(a.msmtDttm).localeCompare(extractTime(b.msmtDttm)));

      const slots: NormalizedTimeSlot[] = items.map((it) => {
        const time = extractTime(it.msmtDttm);
        const level = levelOf(it.stinLofa);
        return {
          time,
          hourLabel: classifyHour(time),
          stinLofa: Math.round(it.stinLofa * 100) / 100,
          level,
          label: labelOf(level),
        };
      });

      return {
        plfNo,
        directionLabel: directionLabelOf(plfNo),
        measureArea: sample.stinFlorDvNm, // 보통 "열차객실"
        timeSlots: slots,
      };
    });

  // 현재 슬롯 — 각 방향에서 slotTarget과 일치하는 시각 찾기
  // 없으면 가장 가까운 슬롯으로 fallback
  const currentDirs = directions.map((dir) => {
    let slot = dir.timeSlots.find((s) => s.time === slotTarget);
    if (!slot) {
      // 가장 가까운 슬롯 — 시간 차이 절대값으로
      const targetMin = toMinutes(slotTarget);
      slot = dir.timeSlots.reduce((best, cur) => {
        const dBest = Math.abs(toMinutes(best.time) - targetMin);
        const dCur = Math.abs(toMinutes(cur.time) - targetMin);
        return dCur < dBest ? cur : best;
      }, dir.timeSlots[0]);
    }
    return {
      plfNo: dir.plfNo,
      directionLabel: dir.directionLabel,
      stinLofa: slot.stinLofa,
      level: slot.level,
      label: slot.label,
    };
  });

  // 추천: 두 방향 중 stinLofa 낮은 쪽
  const sorted = [...currentDirs].sort((a, b) => a.stinLofa - b.stinLofa);
  const recommended =
    sorted.length >= 2 && sorted[0].stinLofa < sorted[1].stinLofa
      ? {
          plfNo: sorted[0].plfNo,
          directionLabel: sorted[0].directionLabel,
          label: sorted[0].label,
          reason: `${sorted[0].directionLabel} 방면이 더 ${sorted[0].label}해요`,
        }
      : null;

  return {
    stinCd: sample.stinCd,
    lnCd: sample.lnCd,
    quarter,
    directions,
    current: {
      time: slotTarget,
      hourLabel: classifyHour(slotTarget),
      directions: currentDirs,
      recommended,
    },
    generatedAt: new Date().toISOString(),
  };
}

/** "HH:MM" → 분 (시간 비교용) */
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map((s) => parseInt(s, 10));
  return h * 60 + (m || 0);
}

// ─────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────

/**
 * 역사별 혼잡도 — raw 호출 + 정규화
 * @param targetTime 선택 슬롯 (예: "08:00"). 생략 시 현재 시각 기준.
 */
export async function getStationCongestion(
  query: StationCongestionQuery,
  targetTime?: string
): Promise<NormalizedStationCongestion> {
  const { raw } = await callKric("stationCongestion", {
    railOprIsttCd: query.railOprIsttCd ?? "S1",
    lnCd: query.lnCd,
    stinCd: query.stinCd,
  });
  return normalize(raw as any, targetTime);
}

/** raw 그대로 (디버그용 — 기존 함수 유지) */
export async function getStationCongestionRaw(query: StationCongestionQuery) {
  return callKric("stationCongestion", {
    railOprIsttCd: query.railOprIsttCd ?? "S1",
    lnCd: query.lnCd,
    stinCd: query.stinCd,
  });
}
