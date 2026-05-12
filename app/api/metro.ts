// 백엔드 /api/metro/* 엔드포인트 래퍼
// 화면/훅에서는 이 모듈만 import해서 사용

import { apiClient, toFriendlyError } from "./client";
import type {
  TrainPosition,
  StationArrival,
  ApiResponse,
} from "../../shared/types/metro";

/**
 * 특정 역의 실시간 도착 정보 조회
 * @param stationName 한글 역 이름 (예: "사당")
 * @param lineCode 1001~1009. undefined면 필터 없음 (모든 호선).
 *
 * 강남역처럼 신분당선(1077)/2호선(1002)이 섞이는 환승역에서
 * 사용자가 고른 출발 호선만 받아오기 위한 동적 필터.
 *
 * ⚠️ 이전엔 `onlyLine4 = true` 기본값으로 모든 호출이 4호선만 받아오는
 *    버그가 있었다 (강남 2호선 → 빈 응답). 이제 호출자가 명시적으로
 *    lineCode 를 넘겨야 한다.
 */
export async function getArrivals(
  stationName: string,
  lineCode?: number
): Promise<StationArrival[]> {
  try {
    const params = lineCode ? { line: lineCode } : undefined;
    const { data } = await apiClient.get<ApiResponse<StationArrival[]>>(
      `/api/metro/station/${encodeURIComponent(stationName)}/arrivals`,
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
 * 특정 호선의 실시간 열차 위치 조회
 * @param lineCode 호선 코드 (1004 = 4호선)
 */
export async function getPositions(
  lineCode: number = 1004
): Promise<TrainPosition[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<TrainPosition[]>>(
      `/api/metro/line/${lineCode}/positions`
    );

    if (!data.success || !data.data) {
      throw new Error(data.error?.message ?? "응답 형식 오류");
    }
    return data.data;
  } catch (err) {
    throw toFriendlyError(err);
  }
}
