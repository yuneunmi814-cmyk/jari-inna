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
 * @param onlyLine4 true면 4호선만 필터링
 */
export async function getArrivals(
  stationName: string,
  onlyLine4 = true
): Promise<StationArrival[]> {
  try {
    const params = onlyLine4 ? { line: 1004 } : undefined;
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
