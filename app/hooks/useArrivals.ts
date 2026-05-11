// 실시간 도착 정보 폴링 훅
// - 마운트 시 즉시 1회 호출
// - 5초마다 자동 갱신
// - station이 바뀌면 즉시 재호출
// - refresh() 수동 호출 가능 (pull-to-refresh용)
// - 백그라운드 중에는 폴링 멈춤 (배터리 절약)

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { getArrivals } from "../api/metro";
import type { StationArrival } from "../../shared/types/metro";

const POLL_INTERVAL_MS = 5000;

export function useArrivals(stationName: string) {
  const [data, setData] = useState<StationArrival[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 실제 API 호출 — manual 플래그로 pull-to-refresh 구분 */
  const fetch = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const result = await getArrivals(stationName, true);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [stationName]
  );

  // 폴링 시작/정지
  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(() => fetch(), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch]);

  // 앱이 백그라운드 → 폴링 정지, 다시 active → 즉시 1회 호출 후 재개
  useEffect(() => {
    const handleChange = (state: AppStateStatus) => {
      if (state === "active") {
        fetch();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => fetch(), POLL_INTERVAL_MS);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };
    const sub = AppState.addEventListener("change", handleChange);
    return () => sub.remove();
  }, [fetch]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: () => fetch(true),
  };
}
