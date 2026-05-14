// 선택된 출발역 / 도착역 / 방면 / 호선코드를 전역으로 관리
//
// 필드 의미:
//   - station          : 출발역 (영속화됨)
//   - departureLine    : 출발역 호선 ('1'~'9', 기본 '4'). 환승역은 사용자가 모달에서 선택.
//   - destination      : 도착역 (세션 한정)
//   - destinationLine  : 도착역 호선 (세션 한정)
//   - direction        : 사용자가 직접 고른 방면. destination이 있으면 무시.
//
// AsyncStorage:
//   - station, departureLine 둘 다 영속화 (앱 재시작 시 복원)
//   - destination/destinationLine/direction은 세션 한정

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { LineKey } from "../constants/lines";
import type { Direction } from "../utils/directionCalculator";
import { STORAGE_KEYS } from "../utils/storageKeys";

const STORAGE_STATION = STORAGE_KEYS.selectedStation;
const STORAGE_DEP_LINE = STORAGE_KEYS.departureLine;
const DEFAULT_STATION = "사당";
const DEFAULT_LINE: LineKey = "4";

type StationContextValue = {
  /** 출발역 (영속화) */
  station: string;
  /** 출발역 호선 (영속화, 기본 '4') */
  departureLine: LineKey;
  /**
   * GPS 로 자동 선택됐는지. 사용자가 수동 선택하면 false 로 변경.
   * - 매 세션 마운트 시 false 로 시작
   * - useNearestStation 결과로 setStationFromGps 호출 시 true
   * - 사용자 수동 setStation 호출 시 false
   */
  isGpsSelected: boolean;
  /** 출발역을 변경 (수동). lineCode를 함께 명시 가능 (환승역 모달에서 사용) */
  setStation: (name: string, lineCode?: LineKey) => void;
  /** GPS 자동 선택으로 출발역 변경 — isGpsSelected = true */
  setStationFromGps: (name: string, lineCode?: LineKey) => void;
  /** 출발역 호선만 단독으로 변경 */
  setDepartureLine: (ln: LineKey) => void;

  /** 도착역 (세션 한정) */
  destination: string | null;
  destinationLine: LineKey | null;
  setDestination: (name: string | null, lineCode?: LineKey) => void;
  setDestinationLine: (ln: LineKey | null) => void;

  /** 직접 선택한 방면 (도착역 없을 때만 의미) */
  direction: Direction | null;
  setDirection: (d: Direction | null) => void;

  /** 도착역/방면 한꺼번에 리셋 */
  resetTrip: () => void;

  /** 출발 ↔ 도착 swap (호선도 함께 교환) */
  swapStations: () => void;

  /**
   * 출발 + 도착 + 호선을 한 번에 set (경로 즐겨찾기 적용 시).
   * lineCode 생략 시 default '4' (기존 즐겨찾기 자동 마이그레이션).
   */
  setTrip: (
    departure: string,
    destination: string,
    departureLine?: LineKey,
    destinationLine?: LineKey
  ) => void;

  ready: boolean;
};

const StationContext = createContext<StationContextValue | null>(null);

export function StationProvider({ children }: { children: React.ReactNode }) {
  const [station, setStationState] = useState<string>(DEFAULT_STATION);
  const [departureLine, setDepartureLineState] = useState<LineKey>(DEFAULT_LINE);
  const [destination, setDestinationState] = useState<string | null>(null);
  const [destinationLine, setDestinationLineState] = useState<LineKey | null>(null);
  const [direction, setDirectionState] = useState<Direction | null>(null);
  const [ready, setReady] = useState(false);
  // GPS 자동 선택 여부 — 매 세션 마운트 시 false (영속화 X).
  // 사용자가 수동 선택하면 false 로 전환 — 그 세션 동안 GPS 재호출 안 함.
  const [isGpsSelected, setIsGpsSelected] = useState(false);

  // 앱 시작 시 저장된 출발역 + 호선 복원
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_STATION),
      AsyncStorage.getItem(STORAGE_DEP_LINE),
    ])
      .then(([savedStation, savedLine]) => {
        if (savedStation && savedStation.trim()) {
          setStationState(savedStation);
        }
        if (savedLine && /^[1-9]$/.test(savedLine)) {
          setDepartureLineState(savedLine as LineKey);
        }
        console.log("[StationContext] 복원:", { savedStation, savedLine });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setStation = (name: string, lineCode?: LineKey) => {
    const ln = lineCode ?? DEFAULT_LINE;
    console.log("[StationContext] setStation (수동):", { name, lineCode: ln });
    setStationState(name);
    setDepartureLineState(ln);
    setIsGpsSelected(false); // 수동 선택 — GPS 라벨 X, 이 세션은 GPS 재호출 안 함
    // 출발역 바뀌면 도착/방면 reset
    setDestinationState(null);
    setDestinationLineState(null);
    setDirectionState(null);
    AsyncStorage.setItem(STORAGE_STATION, name).catch(() => {});
    AsyncStorage.setItem(STORAGE_DEP_LINE, ln).catch(() => {});
  };

  /**
   * GPS 로 자동 선택. 사용자 수동 setStation 과 다음 차이:
   *   - isGpsSelected = true (UI 라벨 "📍 GPS" 표시)
   *   - AsyncStorage 도 저장 (다음 세션 fallback 용)
   *   - 도착/방면 reset 안 함 (HomeScreen 진입 시 호출되므로)
   */
  const setStationFromGps = (name: string, lineCode?: LineKey) => {
    const ln = lineCode ?? DEFAULT_LINE;
    console.log("[StationContext] setStationFromGps:", { name, lineCode: ln });
    setStationState(name);
    setDepartureLineState(ln);
    setIsGpsSelected(true);
    AsyncStorage.setItem(STORAGE_STATION, name).catch(() => {});
    AsyncStorage.setItem(STORAGE_DEP_LINE, ln).catch(() => {});
  };

  const setDepartureLine = (ln: LineKey) => {
    console.log("[StationContext] setDepartureLine:", ln);
    setDepartureLineState(ln);
    // 호선 변경 시 direction 리셋 — 호선별 방면 의미가 달라서 stale state 위험.
    // 예) 4호선 "down"(오이도행) 선택 후 2호선으로 바꾸면 "down"이 DirectionToggle
    // 에서 "외선"으로 매핑돼 의도치 않은 chip 활성화.
    setDirectionState(null);
    AsyncStorage.setItem(STORAGE_DEP_LINE, ln).catch(() => {});
  };

  const setDestination = (name: string | null, lineCode?: LineKey) => {
    console.log("[StationContext] setDestination:", { name, lineCode });
    setDestinationState(name);
    setDestinationLineState(name ? (lineCode ?? DEFAULT_LINE) : null);
    if (name) setDirectionState(null); // 도착역 우선
  };

  const setDestinationLine = (ln: LineKey | null) => {
    setDestinationLineState(ln);
  };

  const setDirection = (d: Direction | null) => {
    setDirectionState(d);
    if (d) setDestinationState(null);
  };

  const resetTrip = () => {
    setDestinationState(null);
    setDestinationLineState(null);
    setDirectionState(null);
  };

  /**
   * 출발 + 도착 + 호선을 한 번에 set
   * setStation의 reset 부작용 회피, 양쪽 state 직접 set
   */
  const setTrip = (
    newDeparture: string,
    newDestination: string,
    newDepartureLine?: LineKey,
    newDestinationLine?: LineKey
  ) => {
    const depLn = newDepartureLine ?? DEFAULT_LINE;
    const dstLn = newDestinationLine ?? DEFAULT_LINE;
    console.log("[StationContext] setTrip:", {
      newDeparture, newDestination, depLn, dstLn,
    });
    setStationState(newDeparture);
    setDepartureLineState(depLn);
    setDestinationState(newDestination);
    setDestinationLineState(dstLn);
    setDirectionState(null);
    AsyncStorage.setItem(STORAGE_STATION, newDeparture).catch(() => {});
    AsyncStorage.setItem(STORAGE_DEP_LINE, depLn).catch(() => {});
  };

  /** 출발 ↔ 도착 swap (호선도 함께) */
  const swapStations = () => {
    if (!destination) return;
    const newDep = destination;
    const newDst = station;
    const newDepLn = destinationLine ?? DEFAULT_LINE;
    const newDstLn = departureLine;
    console.log("[StationContext] swapStations");
    setStationState(newDep);
    setDepartureLineState(newDepLn);
    setDestinationState(newDst);
    setDestinationLineState(newDstLn);
    setDirectionState(null);
    AsyncStorage.setItem(STORAGE_STATION, newDep).catch(() => {});
    AsyncStorage.setItem(STORAGE_DEP_LINE, newDepLn).catch(() => {});
  };

  return (
    <StationContext.Provider
      value={{
        station,
        departureLine,
        isGpsSelected,
        setStation,
        setStationFromGps,
        setDepartureLine,
        destination,
        destinationLine,
        setDestination,
        setDestinationLine,
        direction,
        setDirection,
        resetTrip,
        swapStations,
        setTrip,
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
