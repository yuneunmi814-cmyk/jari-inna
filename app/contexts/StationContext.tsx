// 현재 선택된 출발역을 전역으로 관리
// 단순한 useState만으로 충분 — 화면 1~2개가 함께 보는 작은 상태
// AsyncStorage 영속화도 함께 처리해서 앱 재시작해도 마지막 선택 유지

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "@jari-inna/selected-station";
const DEFAULT_STATION = "사당"; // 4호선의 대표 환승역

type StationContextValue = {
  station: string;
  setStation: (name: string) => void;
  ready: boolean; // AsyncStorage 로드 완료 여부
};

const StationContext = createContext<StationContextValue | null>(null);

export function StationProvider({ children }: { children: React.ReactNode }) {
  const [station, setStationState] = useState<string>(DEFAULT_STATION);
  const [ready, setReady] = useState(false);

  // 앱 시작 시 저장된 출발역 복원
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && saved.trim()) setStationState(saved);
      })
      .catch(() => {
        // 저장소 에러는 무시 (기본값 사용)
      })
      .finally(() => setReady(true));
  }, []);

  const setStation = (name: string) => {
    setStationState(name);
    AsyncStorage.setItem(STORAGE_KEY, name).catch(() => {
      // 저장 실패해도 UI 동작은 계속
    });
  };

  return (
    <StationContext.Provider value={{ station, setStation, ready }}>
      {children}
    </StationContext.Provider>
  );
}

export function useStation() {
  const ctx = useContext(StationContext);
  if (!ctx) {
    throw new Error("useStation은 StationProvider 안에서만 사용 가능합니다");
  }
  return ctx;
}
