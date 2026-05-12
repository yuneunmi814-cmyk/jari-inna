// 방면 계산 유틸 — 1~9호선 일반화 (B4)
//
// 호선별 방면:
//   - 직선 노선 (1/3/4/5/7/8/9호선): 시발 ↔ 종착 일직선, index 비교
//   - 순환선 (2호선): 시계 방향(내선) vs 반대(외선) — 짧은 경로 선택
//   - 6호선: 응암역에서만 단방향 순환 분기 (응암순환행 vs 봉화산행).
//            그 외 출발역은 일반 직선 로직 (downTerminus = '봉화산').
//
// 데이터 source:
//   - 4호선: line4Stations.ts LINE_4_STATIONS (47개, KORAIL/남양주 포함)
//   - 그 외 호선: lines.ts LINE_STATIONS[lineCode] (서울교통/메트로9 직영)

import {
  getStationOrder as getLine4Order,
  LINE_4_STATIONS,
  TERMINUS_DOWN,
  TERMINUS_UP,
} from "../constants/line4Stations";
import {
  LINES,
  LINE_STATIONS,
  type LineKey,
} from "../constants/lines";

/** 정거장당 평균 소요 시간 (분) */
const AVG_MINUTES_PER_STOP = 2;

/** 진행 방향 식별자 — 일직선은 up/down, 순환선은 inner/outer */
export type Direction = "up" | "down" | "inner" | "outer";

export interface DirectionResult {
  /** "up" = 시발(상행), "down" = 종착(하행), "inner"/"outer" = 순환선 */
  direction: Direction;
  /** 가야 할 종착역 이름 (순환선은 라벨 그대로) */
  terminus: string;
  /** 사용자에게 보여줄 짧은 라벨 (예: "당고개행", "내선순환") */
  label: string;
  /** 방면 텍스트 (예: "당고개 방면", "내선순환") */
  directionText: string;
}

// ─────────────────────────────────────────────────────────────────
// 헬퍼: 호선별 역 순서 lookup
// ─────────────────────────────────────────────────────────────────

/**
 * 4호선만 LINE_4_STATIONS의 47개 (KORAIL 포함).
 * 그 외는 LINE_STATIONS[lineCode]의 simpleName 배열.
 */
function getOrderedStationNames(lineCode: string): string[] {
  if (lineCode === "4") {
    return LINE_4_STATIONS.map((s) => s.name);
  }
  const list = LINE_STATIONS[lineCode as LineKey];
  if (!list) return [];
  return list.map((s) => s.simpleName);
}

/** 역 이름 → 호선 안 index. 없으면 -1 */
function getOrderIndex(stationName: string, lineCode: string): number {
  if (lineCode === "4") return getLine4Order(stationName);
  const names = getOrderedStationNames(lineCode);
  return names.indexOf(stationName);
}

// ─────────────────────────────────────────────────────────────────
// 메인 API
// ─────────────────────────────────────────────────────────────────

/**
 * 출발 → 도착 방면 계산.
 * lineCode 생략 시 4호선 (기존 호환).
 */
export function calculateDirection(
  fromStation: string,
  toStation: string,
  lineCode: string = "4"
): DirectionResult | null {
  // 2호선은 순환선이라 별도 처리
  if (lineCode === "2") {
    return direction2Loop(fromStation, toStation);
  }
  // 6호선은 응암역에서 단방향 분기가 있어 응암 출발만 특수 처리
  if (lineCode === "6") {
    return direction6(fromStation, toStation);
  }
  return directionLinear(fromStation, toStation, lineCode);
}

/**
 * 6호선 응암 단방향 순환 처리
 *
 * 응암역은 실제로 단방향 루프 시발역:
 *   응암 → 새절 → 증산 → DMC → 월드컵 → 마포구청 → 망원 → 합정 → ... → 봉화산
 *   (반대 방향: 봉화산 → ... → 합정 → ... → 연신내 → 독바위 → 불광 → 역촌 → 응암)
 *
 * 사용자 명세 (단순화 모델):
 *   case 1) 응암 → {새절,증산,DMC,월드컵,마포구청,망원,합정} → "응암순환행"
 *   case 2) 응암 → 그 외 모든 역 (역촌/독바위/봉화산 등) → "봉화산행"
 *   case 3) 응암이 출발이 아니면 → directionLinear (일반 호선 로직)
 */
const LINE6_LOOP_DESTINATIONS = new Set([
  "새절",
  "증산",
  "디지털미디어시티",
  "월드컵경기장",
  "마포구청",
  "망원",
  "합정",
]);

function direction6(
  fromStation: string,
  toStation: string
): DirectionResult | null {
  if (fromStation !== "응암") {
    return directionLinear(fromStation, toStation, "6");
  }
  if (fromStation === toStation) return null;

  if (LINE6_LOOP_DESTINATIONS.has(toStation)) {
    console.log(
      "[directionCalc] 6호선 응암순환:",
      fromStation,
      "→",
      toStation
    );
    return {
      direction: "down",
      terminus: "응암순환",
      label: "응암순환행",
      directionText: "응암순환 방면",
    };
  }
  console.log("[directionCalc] 6호선 본선:", fromStation, "→", toStation);
  return {
    direction: "down",
    terminus: "봉화산",
    label: "봉화산행",
    directionText: "봉화산 방면",
  };
}

/**
 * 일직선 호선 (1/3/4/5/6/7/8/9) — index 비교
 * - toIdx < fromIdx → 상행 (upTerminus 방향)
 * - toIdx > fromIdx → 하행 (downTerminus 방향)
 */
function directionLinear(
  fromStation: string,
  toStation: string,
  lineCode: string
): DirectionResult | null {
  const fromIdx = getOrderIndex(fromStation, lineCode);
  const toIdx = getOrderIndex(toStation, lineCode);

  if (fromIdx < 0 || toIdx < 0) {
    // console.log("[directionCalc] 역 미발견:", { fromStation, toStation, lineCode });
    return null;
  }
  if (fromIdx === toIdx) return null;

  const meta = LINES[lineCode as LineKey];
  if (!meta) return null;

  const up = toIdx < fromIdx;
  // 디버그 로그 — 첫 계산 시만 (useMemo로 호출자가 최적화 가정)
  // RecommendationScreen 5초 폴링으로 리렌더 자주 → 로그 산사태 방지 위해 주석 처리.
  // 디버깅 필요 시 임시로 주석 풀고 사용.
  // console.log("[directionCalc] linear:", { lineCode, from: fromStation, to: toStation, fromIdx, toIdx, direction: up ? "up" : "down" });

  if (up) {
    return {
      direction: "up",
      terminus: meta.upTerminus,
      label: `${meta.upTerminus}행`,
      directionText: meta.upLabel,
    };
  }
  return {
    direction: "down",
    terminus: meta.downTerminus,
    label: `${meta.downTerminus}행`,
    directionText: meta.downLabel,
  };
}

/**
 * 2호선 순환 — 짧은 경로로 내선/외선 결정
 *
 * 본선만 사용 (stinCd 201~243의 43개). 지선(234-4/244~250)은 fallback.
 * 짧은 경로:
 *   - forward(stinCd 증가 방향) <= backward → 내선순환
 *   - 그 외 → 외선순환
 *
 * 사용자 검증 예:
 *   강남(222) → 잠실(216): forward=-6(=37)→ backward=6 → 외선 ✅
 *   강남(222) → 사당(226): forward=4 → backward=39 → 내선 ✅
 */
function direction2Loop(
  fromStation: string,
  toStation: string
): DirectionResult | null {
  // 2호선 본선만 추출 (stinCd 201~243, 지선 코드 제외)
  const mainLine = LINE_STATIONS["2"].filter((s) => {
    const cd = parseInt(s.stinCd, 10);
    return /^\d+$/.test(s.stinCd) && cd >= 201 && cd <= 243;
  });

  const fromIdx = mainLine.findIndex((s) => s.simpleName === fromStation);
  const toIdx = mainLine.findIndex((s) => s.simpleName === toStation);

  // 지선 출발/도착 — fallback (정확한 내선/외선 결정 불가)
  if (fromIdx < 0 || toIdx < 0) {
    // console.log("[directionCalc] 2호선 지선:", { fromStation, toStation });
    return {
      direction: "inner",
      terminus: "지선",
      label: "지선 경유",
      directionText: "지선 경유 — 본선에서 환승",
    };
  }
  if (fromIdx === toIdx) return null;

  const N = mainLine.length;
  const forward = (toIdx - fromIdx + N) % N;
  const backward = N - forward;
  const isInner = forward <= backward;
  // console.log("[directionCalc] 2호선 순환:", { fromStation, toStation, fromIdx, toIdx, N, forward, backward, result: isInner ? "inner" : "outer" });

  if (isInner) {
    return {
      direction: "inner",
      terminus: "내선순환",
      label: "내선순환",
      directionText: "내선순환 (시계 방향)",
    };
  }
  return {
    direction: "outer",
    terminus: "외선순환",
    label: "외선순환",
    directionText: "외선순환 (시계 반대)",
  };
}

// ─────────────────────────────────────────────────────────────────
// 보조: 종착역에서 방면 결정 (도착역 모르고 방면만 선택할 때)
// ─────────────────────────────────────────────────────────────────

/**
 * 출발역에서 특정 종착역 방면으로 갈 때의 방면 정보
 * Phase 1 호환 — 4호선 기준 (당고개/오이도) 단순 처리.
 * 호선별 일반화는 lineCode 사용.
 */
export function getDirectionFromTerminus(
  fromStation: string,
  terminus: string,
  lineCode: string = "4"
): DirectionResult | null {
  const fromIdx = getOrderIndex(fromStation, lineCode);
  if (fromIdx < 0) return null;

  const meta = LINES[lineCode as LineKey];
  if (!meta) return null;

  if (terminus === meta.upTerminus) {
    if (fromIdx === 0) return null;
    return {
      direction: "up",
      terminus: meta.upTerminus,
      label: `${meta.upTerminus}행`,
      directionText: meta.upLabel,
    };
  }
  if (terminus === meta.downTerminus) {
    const names = getOrderedStationNames(lineCode);
    if (fromIdx === names.length - 1) return null;
    return {
      direction: "down",
      terminus: meta.downTerminus,
      label: `${meta.downTerminus}행`,
      directionText: meta.downLabel,
    };
  }

  // 4호선 backward compat — terminus가 "당고개" 또는 "오이도" 문자열로 올 때
  if (lineCode === "4" && terminus === TERMINUS_UP) {
    return getDirectionFromTerminus(fromStation, meta.upTerminus, lineCode);
  }
  if (lineCode === "4" && terminus === TERMINUS_DOWN) {
    return getDirectionFromTerminus(fromStation, meta.downTerminus, lineCode);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// 정거장 수 / 소요 시간 / 경유 역
// ─────────────────────────────────────────────────────────────────

/** 두 역 사이 정거장 수 */
export function countStops(
  fromStation: string,
  toStation: string,
  lineCode: string = "4"
): number {
  const fromIdx = getOrderIndex(fromStation, lineCode);
  const toIdx = getOrderIndex(toStation, lineCode);
  if (fromIdx < 0 || toIdx < 0) return 0;

  // 2호선 순환선은 짧은 경로의 정거장 수
  if (lineCode === "2") {
    const mainLine = LINE_STATIONS["2"].filter((s) => {
      const cd = parseInt(s.stinCd, 10);
      return /^\d+$/.test(s.stinCd) && cd >= 201 && cd <= 243;
    });
    const fIdx = mainLine.findIndex((s) => s.simpleName === fromStation);
    const tIdx = mainLine.findIndex((s) => s.simpleName === toStation);
    if (fIdx < 0 || tIdx < 0) return Math.abs(toIdx - fromIdx);
    const N = mainLine.length;
    const forward = (tIdx - fIdx + N) % N;
    return Math.min(forward, N - forward);
  }

  return Math.abs(toIdx - fromIdx);
}

/** 두 역 사이 예상 소요 시간 (정거장당 평균 2분) */
export function estimateTravelMinutes(
  fromStation: string,
  toStation: string,
  lineCode: string = "4"
): number {
  return countStops(fromStation, toStation, lineCode) * AVG_MINUTES_PER_STOP;
}

/**
 * 출발역 → 도착역 경유 역 목록 (출발/도착 포함)
 * 4호선 전용 (다른 호선은 추후 보강)
 */
export function getStationsBetween(
  fromStation: string,
  toStation: string,
  lineCode: string = "4"
): string[] {
  if (lineCode !== "4") return []; // TODO: 다른 호선

  const fromIdx = getLine4Order(fromStation);
  const toIdx = getLine4Order(toStation);
  if (fromIdx < 0 || toIdx < 0) return [];

  const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
  const slice = LINE_4_STATIONS.slice(start, end + 1).map((s) => s.name);
  return fromIdx < toIdx ? slice : slice.reverse();
}
