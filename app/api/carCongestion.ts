// 백엔드 /api/puzzle/car-congestion/* 엔드포인트 래퍼
// PUZZLE (SK Open API) 칸별 혼잡도 통계 — Phase 1 핵심 기능
//
// KRIC 정거장 평균과 다름:
//   KRIC: 정거장 단위 평균 (방면 2개)
//   PUZZLE: 1~10칸 각 칸의 혼잡도 % (게임 체인저)

import { apiClient, toFriendlyError } from "./client";
import type { ApiResponse } from "../../shared/types/metro";

export interface DirectionCongestion {
  updnLine: 0 | 1;
  /** "외선" / "내선" / "상행" / "하행" */
  directionLabel: string;
  /** 1~10칸 혼잡도 % */
  cars: number[];
  avgCongestion: number;
  bestCarNo: number;
  bestCongestion: number;
}

export interface CarCongestionData {
  stationName: string;
  stationCode: string;
  subwayLine: string;
  /** "19:00" */
  time: string;
  /** "퇴근시간" / "출근시간" / "점심시간" / "심야시간" / "일반시간" */
  hourLabel: string;
  directions: DirectionCongestion[];
  recommended?: {
    direction: 0 | 1;
    directionLabel: string;
    bestCarNo: number;
    bestCongestion: number;
    reason: string;
  };
}

/**
 * 특정 역의 칸별 혼잡도 통계
 * @param stationName 한글 역 이름 (예: "강남")
 * @param lineCode '1'~'9' (환승역 모호성 해소)
 */
export async function getCarCongestion(
  stationName: string,
  lineCode?: string
): Promise<CarCongestionData> {
  try {
    const params = lineCode ? { line: lineCode } : undefined;
    const { data } = await apiClient.get<ApiResponse<CarCongestionData>>(
      `/api/puzzle/car-congestion/${encodeURIComponent(stationName)}`,
      { params }
    );
    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? "응답 형식 오류");
    }
    return data.data;
  } catch (err) {
    throw toFriendlyError(err);
  }
}

/**
 * 칸 혼잡도 % → 레벨 매핑 (UI 색상용)
 * 기준 (서울교통공사 4단계):
 *   <30%: 여유 (좌석 충분)
 *   30~80%: 보통
 *   80~130%: 혼잡 (서서 가야)
 *   130%+: 매우 혼잡
 */
export type CarCongestionLevel = "very_low" | "low" | "medium" | "high" | "very_high";

export function carCongestionLevel(pct: number): CarCongestionLevel {
  if (pct < 30) return "very_low";
  if (pct < 60) return "low";
  if (pct < 90) return "medium";
  if (pct < 130) return "high";
  return "very_high";
}

export function carCongestionLabel(pct: number): string {
  const lv = carCongestionLevel(pct);
  if (lv === "very_low") return "여유";
  if (lv === "low") return "보통";
  if (lv === "medium") return "약간 혼잡";
  if (lv === "high") return "혼잡";
  return "매우 혼잡";
}
