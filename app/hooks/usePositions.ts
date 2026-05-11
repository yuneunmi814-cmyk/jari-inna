// 실시간 열차 위치 폴링 훅 (4호선 전체)
// 30초 간격 — 위치 정보는 도착 정보보다 변화가 느림 + 데이터 절약

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { getPositions } from "../api/metro";
import type { TrainPosition } from "../../shared/types/metro";

const POLL_INTERVAL_MS = 30000;

export function usePositions(lineCode: number = 1004) {
  const [data, setData] = useState<TrainPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const result = await getPositions(lineCode);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, [lineCode]);

  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(fetch, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch]);

  useEffect(() => {
    const handleChange = (state: AppStateStatus) => {
      if (state === "active") {
        fetch();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(fetch, POLL_INTERVAL_MS);
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

  return { data, loading, error, refresh: fetch };
}
