// 출발역 혼잡도 조회 훅
//
// - 마운트 시 1회 호출 (KRIC 데이터가 분기별 평균이라 자주 fetch 의미 없음)
// - station이 바뀌면 재호출
// - manual refresh() 노출 (pull-to-refresh 등)
// - 지원 안 되는 역(KORAIL/남양주)은 isUnsupported로 분기 가능
//
// Phase 2: 캐싱(같은 시간대 + 같은 역) 추가 검토

import { useCallback, useEffect, useState } from "react";
import {
  getCongestionByStation,
  isCongestionSupportedStation,
  type StationCongestion,
} from "../api/congestion";

interface UseCongestionResult {
  data: StationCongestion | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** 백엔드 호출조차 안 한 미지원 역 (KORAIL/남양주 등) */
  isUnsupported: boolean;
  refresh: () => void;
}

export function useCongestion(stationName: string): UseCongestionResult {
  const [data, setData] = useState<StationCongestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 서울교통공사 26개 역이 아니면 호출 안 함 (서버 호출 절약 + UX)
  const isUnsupported = !isCongestionSupportedStation(stationName);

  const fetch = useCallback(
    async (manual = false) => {
      if (!stationName) return;
      if (isUnsupported) {
        setLoading(false);
        return;
      }
      if (manual) setRefreshing(true);
      try {
        const result = await getCongestionByStation(stationName);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [stationName, isUnsupported]
  );

  useEffect(() => {
    setLoading(true);
    setData(null);
    setError(null);
    fetch();
  }, [fetch]);

  return {
    data,
    loading,
    refreshing,
    error,
    isUnsupported,
    refresh: () => fetch(true),
  };
}
