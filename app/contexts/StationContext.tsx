// 선택된 출발역 / 도착역 / 방면을 전역으로 관리
//
// 필드 의미:
//   - station         : 출발역 (기존 호환 유지, 향후 departureStation으로 점진적 마이그레이션 검토)
//   - destination     : 도착역 (선택사항). 선택 시 방면 자동 계산.
//   - direction       : 사용자가 직접 고른 방면 ("up"=당고개행, "down"=오이도행).
//                       destination이 있으면 direction은 무시되고 destination 기반 계산이 우선.
//
// 영속화:
//   - station만 AsyncStorage 저장. destination/direction은 세션 한정(앱 재시작 시 초기화).
//   - 출발역은 거의 동일하지만 도착역은 그때그때 다름 — 매번 새로 선택하는 게 자연스러움.

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { Direction } from "../utils/directionCalculator";

const STORAGE_KEY = "@jari-inna/selected-station";
const DEFAULT_STATION = "사당";

type StationContextValue = {
  /** 출발역 (영속화됨) */
  station: string;
  setStation: (name: string) => void;

  /** 도착역 (세션 한정) */
  destination: string | null;
  setDestination: (name: string | null) => void;

  /** 직접 선택한 방면 (도착역 없을 때만 의미 있음) */
  direction: Direction | null;
  setDirection: (d: Direction | null) => void;

  /** 도착역/방면 한꺼번에 리셋 — "다시 고를래요" 같은 경우 */
  resetTrip: () => void;

  /** 출발역 ↔ 도착역 한 번에 swap (도착역 있을 때만 의미) */
  swapStations: () => void;

  /** AsyncStorage 로드 완료 여부 */
  ready: boolean;
};

const StationContext = createContext<StationContextValue | null>(null);

export function StationProvider({ children }: { children: React.ReactNode }) {
  const [station, setStationState] = useState<string>(DEFAULT_STATION);
  const [destination, setDestinationState] = useState<string | null>(null);
  const [direction, setDirectionState] = useState<Direction | null>(null);
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
    // 출발역이 바뀌면 기존 도착역/방면 조합이 깨질 수 있어 함께 초기화
    setDestinationState(null);
    setDirectionState(null);
    AsyncStorage.setItem(STORAGE_KEY, name).catch(() => {});
  };

  /**
   * 도착역 설정 — 도착역이 정해지면 사용자가 직접 고른 방면은 더 이상 필요 없음
   */
  const setDestination = (name: string | null) => {
    setDestinationState(name);
    if (name) setDirectionState(null); // 도착역 우선
  };

  /**
   * 방면 직접 선택 — 도착역 모르는 상태에서 "그냥 당고개 방면 열차 알려줘" 시나리오
   */
  const setDirection = (d: Direction | null) => {
    setDirectionState(d);
    if (d) setDestinationState(null); // 둘 중 하나만 활성
  };

  const resetTrip = () => {
    setDestinationState(null);
    setDirectionState(null);
  };

  /**
   * 출발역 ↔ 도착역 동시 교환
   * setStation의 초기화 부작용(도착역/방면 null)을 피하기 위해
   * 내부 state를 직접 set하고 AsyncStorage만 수동 갱신.
   * 방면은 새 출발/도착 페어로 자동 재계산되므로 null로 둠.
   */
  const swapStations = () => {
    if (!destination) return; // 도착역 없으면 swap 의미 없음
    const newDeparture = destination;
    const newDestination = station;
    setStationState(newDeparture);
    setDestinationState(newDestination);
    setDirectionState(null);
    AsyncStorage.setItem(STORAGE_KEY, newDeparture).catch(() => {});
  };

  return (
    <StationContext.Provider
      value={{
        station,
        setStation,
        destination,
        setDestination,
        direction,
        setDirection,
        resetTrip,
        swapStations,
        ready,
      }}
    >
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
