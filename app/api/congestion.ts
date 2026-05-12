// 백엔드 /api/congestion/* 래퍼 (KRIC 혼잡도 데이터)
//
// 사용처: RecommendationScreen에서 출발역 혼잡도 표시
// 백엔드가 KRIC 응답을 정규화해서 보내주므로 앱은 lookup/표시만.

import { apiClient, toFriendlyError } from "./client";

export type CongestionLevel = "very_low" | "low" | "medium" | "high" | "very_high";
export type CongestionLabel = "여유" | "한산" | "보통" | "혼잡" | "매우 혼잡";

export interface CongestionTimeSlot {
  time: string;          // "08:00"
  hourLabel: string;     // "출근시간"
  stinLofa: number;
  level: CongestionLevel;
  label: CongestionLabel;
}

export interface CongestionDirection {
  plfNo: number;
  directionLabel: "상행" | "하행" | string;
  measureArea: string;
  timeSlots: CongestionTimeSlot[];
}

export interface CongestionCurrentDirection {
  plfNo: number;
  directionLabel: string;
  stinLofa: number;
  level: CongestionLevel;
  label: CongestionLabel;
}

export interface CongestionRecommend {
  plfNo: number;
  directionLabel: string;
  label: CongestionLabel;
  reason: string;
}

export interface StationCongestion {
  stationName: string;
  kricName: string;
  operator: string;
  stinCd: string;
  lnCd: string;
  quarter: string;
  directions: CongestionDirection[];
  current: {
    time: string;
    hourLabel: string;
    directions: CongestionCurrentDirection[];
    recommended: CongestionRecommend | null;
  };
  generatedAt: string;
}

/** 백엔드 표준 응답 envelope */
interface Envelope<T> {
  success: boolean;
  data?: T;
  source?: string;
  error?: { code: string; message: string };
  timestamp: string;
}

/**
 * 역명으로 혼잡도 조회 (자동 stinCd lookup)
 *
 * @param stationName  앱 표시명 또는 KRIC 정식명 (별칭 자동 매핑)
 * @param time         "HH:MM" 슬롯 지정 (생략 시 현재 시각)
 */
export async function getCongestionByStation(
  stationName: string,
  time?: string
): Promise<StationCongestion> {
  try {
    const { data } = await apiClient.get<Envelope<StationCongestion>>(
      `/api/congestion/station/${encodeURIComponent(stationName)}`,
      { params: time ? { time } : undefined }
    );
    if (!data.success || !data.data) {
      // 404(역 없음) / 502(KORAIL/남양주 미지원) 등 백엔드 친근한 메시지 그대로 throw
      throw new Error(data.error?.message ?? "혼잡도 정보를 가져올 수 없어요");
    }
    return data.data;
  } catch (err) {
    throw toFriendlyError(err);
  }
}

/**
 * 혼잡도 데이터가 이 역에 제공되는지 여부 (UI에서 사전 체크용 — 옵션)
 * 현재는 호출해보는 게 가장 정확. 차후 lookup 테이블 추가 가능.
 */
export function isCongestionSupportedStation(stationName: string): boolean {
  // Phase 1: 서울교통공사 26개 역만 KRIC stationCongestion에 데이터 있음
  const supported = new Set([
    "당고개","상계","노원","창동","쌍문","수유","미아","미아사거리","길음",
    "성신여대입구","한성대입구","혜화","동대문","동대문역사문화공원","충무로",
    "명동","회현","서울역","숙대입구","삼각지","신용산","이촌","동작","이수","사당","남태령",
  ]);
  return supported.has(stationName.trim());
}
