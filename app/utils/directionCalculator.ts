// 4호선 방면 계산 유틸
//
// 두 역의 운행 순서를 비교해서 어느 종착역 방면으로 가야 하는지 결정한다.
// Phase 1은 양 끝 종착역(당고개/오이도)만 사용. 단축 운행은 Phase 2 이후.
//
// 사용 예:
//   calculateDirection("사당", "명동")   // → { direction: "up", terminus: "당고개", label: "당고개행" }
//   calculateDirection("명동", "사당")   // → { direction: "down", terminus: "오이도", label: "오이도행" }
//   countStops("사당", "명동")           // → 9 (정거장 개수)
//   estimateTravelMinutes("사당", "명동") // → 약 18분 (정거장당 2분 가정)

import {
  getStationOrder,
  LINE_4_STATIONS,
  TERMINUS_DOWN,
  TERMINUS_UP,
} from "../constants/line4Stations";

/** 정거장당 평균 소요 시간 (분) — Phase 2에서 실제 시간표 기반으로 보정 예정 */
const AVG_MINUTES_PER_STOP = 2;

/** 진행 방향 식별자 */
export type Direction = "up" | "down";

export interface DirectionResult {
  /** "up" = 당고개 방면(index 감소), "down" = 오이도 방면(index 증가) */
  direction: Direction;
  /** 가야 할 종착역 이름 */
  terminus: string;
  /** 사용자에게 보여줄 라벨 (예: "당고개행") */
  label: string;
  /** 사용자에게 보여줄 방면 텍스트 (예: "당고개 방면") */
  directionText: string;
}

/**
 * 출발역에서 도착역으로 가는 방면을 계산
 *
 * @returns 방면 정보 또는 null
 *   - 같은 역이거나 한쪽이 4호선이 아니면 null
 */
export function calculateDirection(
  fromStation: string,
  toStation: string
): DirectionResult | null {
  const fromIdx = getStationOrder(fromStation);
  const toIdx = getStationOrder(toStation);

  // 한쪽이라도 4호선 역이 아니면 계산 불가
  if (fromIdx < 0 || toIdx < 0) return null;
  // 같은 역이면 의미 없음
  if (fromIdx === toIdx) return null;

  // 도착역의 index가 더 작으면 → 상행(당고개행)
  // 도착역의 index가 더 크면 → 하행(오이도행)
  if (toIdx < fromIdx) {
    return {
      direction: "up",
      terminus: TERMINUS_UP,
      label: `${TERMINUS_UP}행`,
      directionText: `${TERMINUS_UP} 방면`,
    };
  }

  return {
    direction: "down",
    terminus: TERMINUS_DOWN,
    label: `${TERMINUS_DOWN}행`,
    directionText: `${TERMINUS_DOWN} 방면`,
  };
}

/**
 * 출발역에서 특정 방면으로 갈 때의 종착역 정보
 * (도착역 모르고 방면만 선택할 때 사용)
 */
export function getDirectionFromTerminus(
  fromStation: string,
  terminus: string
): DirectionResult | null {
  const fromIdx = getStationOrder(fromStation);
  if (fromIdx < 0) return null;

  if (terminus === TERMINUS_UP) {
    if (fromIdx === 0) return null; // 본인이 종착역
    return {
      direction: "up",
      terminus: TERMINUS_UP,
      label: `${TERMINUS_UP}행`,
      directionText: `${TERMINUS_UP} 방면`,
    };
  }
  if (terminus === TERMINUS_DOWN) {
    if (fromIdx === LINE_4_STATIONS.length - 1) return null;
    return {
      direction: "down",
      terminus: TERMINUS_DOWN,
      label: `${TERMINUS_DOWN}행`,
      directionText: `${TERMINUS_DOWN} 방면`,
    };
  }
  return null;
}

/**
 * 두 역 사이 정거장 수 (출발역 제외, 도착역 포함)
 * 예: 사당 → 명동 = 9정거장 (총신대~혜화 9곳 거쳐 명동 도착)
 */
export function countStops(fromStation: string, toStation: string): number {
  const fromIdx = getStationOrder(fromStation);
  const toIdx = getStationOrder(toStation);
  if (fromIdx < 0 || toIdx < 0) return 0;
  return Math.abs(toIdx - fromIdx);
}

/**
 * 두 역 사이 예상 소요 시간 (분)
 * Phase 1: 정거장당 2분 단순 환산
 * Phase 2: 실제 시간표 데이터 기반 정확 계산 예정
 */
export function estimateTravelMinutes(
  fromStation: string,
  toStation: string
): number {
  return countStops(fromStation, toStation) * AVG_MINUTES_PER_STOP;
}

/**
 * 출발역 → 도착역 사이 경유 역 목록 (출발/도착 포함)
 * 추후 RecommendationScreen에서 "지나는 역" 시각화에 사용 가능
 */
export function getStationsBetween(
  fromStation: string,
  toStation: string
): string[] {
  const fromIdx = getStationOrder(fromStation);
  const toIdx = getStationOrder(toStation);
  if (fromIdx < 0 || toIdx < 0) return [];

  const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
  const slice = LINE_4_STATIONS.slice(start, end + 1).map((s) => s.name);
  // 진행 방향에 맞춰 순서 반전
  return fromIdx < toIdx ? slice : slice.reverse();
}
