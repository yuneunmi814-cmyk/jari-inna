// PUZZLE 칸별 혼잡도 통계 훅
//
// - 마운트 시 1회 호출 (5분 캐시 backend)
// - station/lineCode 바뀌면 재호출
// - manual refresh() 노출
// - SK Open API 통계 데이터라 자주 갱신 불필요 (백엔드 5분 캐시)

import { useCallback, useEffect, useState } from "react";
import { getCarCongestion, type CarCongestionData } from "../api/carCongestion";

interface UseCarCongestionResult {
  data: CarCongestionData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCarCongestion(
  stationName: string,
  lineCode?: string
): UseCarCongestionResult {
  const [data, setData] = useState<CarCongestionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (manual = false) => {
      if (!stationName) return;
      if (manual) setRefreshing(true);
      try {
        const result = await getCarCongestion(stationName, lineCode);
        setData(result);
        setError(null);
        console.log(
          "[CarCongestion]",
          stationName,
          `(${lineCode ?? "?"})`,
          "방면",
          result.directions.length,
          "추천:",
          result.recommended?.reason ?? "X"
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        setError(msg);
        console.warn("[CarCongestion] fetch error:", msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [stationName, lineCode]
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
    refresh: () => fetch(true),
  };
}
