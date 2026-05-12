// 역 lookup 헬퍼 — StationPicker가 호선 필터에 맞춰 역 리스트를 가져오게
//
// 데이터 source 결정 규칙:
//   - 4호선: line4Stations.ts (LINE_4_STATIONS) 47개 사용 (서울교통 26 + KORAIL 21)
//     (KORAIL 안산선/과천선까지 포함되어야 사용자 출퇴근 경험 보존)
//   - 다른 호선: lines.ts (LINE_STATIONS) 자동 생성 데이터
//   - "all": 모든 호선 통합 — 환승역 중복 제거 (같은 simpleName 한 번만)

import {
  getChosung,
  LINE_4_STATIONS,
  type StationInfo,
} from "../constants/line4Stations";
import {
  LINE_STATIONS,
  TRANSFER_STATIONS,
  type LineKey,
} from "../constants/lines";

/** 화면 표시용 역 정보 */
export interface DisplayStation {
  name: string;
  isTransfer: boolean;
  /** 이 역이 속한 호선들 (LineBadges 표시용) */
  lines: LineKey[];
  /** 가나다 인덱스용 초성 */
  chosung: string;
}

/** 호선 순회 순서 — 객체 키 순서 의존 X */
const LINE_ORDER: LineKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** 4호선 역(line4Stations.ts) → DisplayStation 변환 */
function fromLine4(s: StationInfo): DisplayStation {
  const lines = TRANSFER_STATIONS[s.name];
  return {
    name: s.name,
    isTransfer: (lines?.length ?? 0) > 1 || (s.isTransfer ?? false),
    lines: lines ?? ["4"],
    chosung: s.chosung,
  };
}

/** 일반 호선(lines.ts LINE_STATIONS) → DisplayStation 변환 */
function fromLineStations(simpleName: string, lineKey: LineKey): DisplayStation {
  const transferLines = TRANSFER_STATIONS[simpleName];
  return {
    name: simpleName,
    isTransfer: (transferLines?.length ?? 0) > 1,
    lines: transferLines ?? [lineKey],
    chosung: getChosung(simpleName),
  };
}

/**
 * 필터별 역 목록.
 *   - lineKey '1'~'9': 그 호선만
 *   - 'all': 모든 호선 통합 (환승역 중복 제거)
 *
 * '4호선'은 KORAIL/남양주까지 포함되어 47개 반환.
 */
export function getStationsForFilter(
  filter: LineKey | "all"
): DisplayStation[] {
  if (filter === "all") return getAllStations();

  if (filter === "4") {
    // 4호선은 line4Stations.ts의 47개 (KORAIL/남양주 포함)
    return LINE_4_STATIONS.map(fromLine4);
  }

  return LINE_STATIONS[filter].map((s) =>
    fromLineStations(s.simpleName, filter)
  );
}

/**
 * 모든 호선 통합 — 환승역 같은 simpleName은 한 번만.
 * 1호선부터 순회 (호선 번호 순서)
 */
function getAllStations(): DisplayStation[] {
  const seen = new Set<string>();
  const result: DisplayStation[] = [];

  for (const lk of LINE_ORDER) {
    if (lk === "4") {
      // 4호선은 KORAIL/남양주 포함된 LINE_4_STATIONS
      for (const s of LINE_4_STATIONS) {
        if (seen.has(s.name)) continue;
        seen.add(s.name);
        result.push(fromLine4(s));
      }
      continue;
    }
    for (const s of LINE_STATIONS[lk]) {
      if (seen.has(s.simpleName)) continue;
      seen.add(s.simpleName);
      result.push(fromLineStations(s.simpleName, lk));
    }
  }
  return result;
}

/** 전체 역 한 번 계산 (search 효율) — 모듈 로드 시점 1회만 */
export const ALL_DISPLAY_STATIONS: ReadonlyArray<DisplayStation> = getAllStations();

/**
 * 역명으로 전체 호선 검색 (호선 필터 무시).
 * StationPicker의 검색바가 사용.
 */
export function searchAllStations(query: string): DisplayStation[] {
  const q = query.trim();
  if (!q) return [];
  return ALL_DISPLAY_STATIONS.filter((s) => s.name.includes(q));
}
