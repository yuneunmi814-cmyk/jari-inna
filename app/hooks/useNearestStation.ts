// GPS 기반 가장 가까운 지하철역 훅
//
// 동작:
//   - 마운트 시 (1회) 자동으로 권한 요청 + 위치 fetch
//   - refresh() 수동 호출 가능 ("📍 내 위치 근처 역" 버튼)
//   - 권한 거부 시 status = "denied" — 사용자에게 안내 + 마지막 선택 사용
//
// 상태:
//   - status: "loading" | "granted" | "denied" | "error" | "out_of_range"
//   - nearest: 가장 가까운 역 1개 + 거리
//   - nearestList: 가까운 역 5개 (UI 후보)
//
// 권한 거부 fallback:
//   - 마지막 선택 (AsyncStorage) 그대로 유지
//   - openSettings() 노출 → 사용자가 직접 설정 변경 가능
//
// expo-location 27.x:
//   - requestForegroundPermissionsAsync 사용 (foreground 만 필요)
//   - Accuracy.Balanced — 도시철도 권역 정확도면 충분 (배터리 절약)

import * as Location from "expo-location";
import { Linking } from "react-native";
import { useCallback, useEffect, useState } from "react";
import {
  findNearestStation,
  findNearestStations,
  type NearestStationResult,
} from "../utils/geoDistance";

export type GpsStatus =
  | "loading" // 초기 또는 진행 중
  | "granted" // 권한 OK + 위치 성공
  | "denied" // 사용자 권한 거부
  | "error" // 위치 fetch 실패 (GPS 끄짐, timeout 등)
  | "out_of_range"; // 위치는 받았는데 5km 이내 지하철역 없음 (지방/해외)

interface UseNearestStationResult {
  status: GpsStatus;
  /** 가장 가까운 역 1개 + 거리 (성공 시) */
  nearest: NearestStationResult | null;
  /** 가까운 5개 후보 (성공 시) */
  nearestList: NearestStationResult[];
  /** 에러 메시지 (error 상태일 때) */
  error: string | null;
  /** 위치 재조회 (사용자 버튼 트리거) */
  refresh: () => Promise<void>;
  /** 권한 거부 시 설정 앱 열기 */
  openSettings: () => void;
}

export function useNearestStation(): UseNearestStationResult {
  const [status, setStatus] = useState<GpsStatus>("loading");
  const [nearest, setNearest] = useState<NearestStationResult | null>(null);
  const [nearestList, setNearestList] = useState<NearestStationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      // 1. 권한 요청 (이미 받았으면 즉시 granted 반환)
      const { status: permStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (permStatus !== "granted") {
        console.log("[useNearestStation] 권한 거부:", permStatus);
        setStatus("denied");
        setNearest(null);
        setNearestList([]);
        return;
      }

      // 2. 현재 위치 — 5초 timeout (지하/실내 등 응답 늦으면 fallback)
      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("위치 timeout (5초)")), 5000)
      );
      const pos = await Promise.race([positionPromise, timeoutPromise]);
      const { latitude, longitude } = pos.coords;
      console.log(
        `[useNearestStation] 위치 받음: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      );

      // 3. 가까운 역 매칭
      const top = findNearestStation(latitude, longitude, 5000);
      const list = findNearestStations(latitude, longitude, 5, 10000);

      if (!top) {
        setStatus("out_of_range");
        setNearest(null);
        setNearestList([]);
        return;
      }

      console.log(
        `[useNearestStation] 가장 가까운 역: ${top.station.name} (${Math.round(top.distanceM)}m)`
      );
      setStatus("granted");
      setNearest(top);
      setNearestList(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      console.warn("[useNearestStation] 에러:", msg);
      setStatus("error");
      setError(msg);
      setNearest(null);
      setNearestList([]);
    }
  }, []);

  // 마운트 시 자동 fetch
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const openSettings = useCallback(() => {
    // iOS / Android 모두 동작 — 앱 권한 설정 페이지
    Linking.openSettings().catch((e) =>
      console.warn("[useNearestStation] 설정 열기 실패:", e)
    );
  }, []);

  return {
    status,
    nearest,
    nearestList,
    error,
    refresh: fetchLocation,
    openSettings,
  };
}
