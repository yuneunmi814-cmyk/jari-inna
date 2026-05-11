// 서울 지하철 4호선 전체 역 목록 (당고개 ↔ 오이도)
// 운행 순서 (상행 = 당고개 방면, 하행 = 오이도 방면)
// `chosung`은 가나다 인덱스용 첫 글자 (한글 초성 단순화)

export interface StationInfo {
  name: string;       // 역 이름
  code?: string;      // statnId (필요 시)
  isTransfer?: boolean; // 환승역 여부
  chosung: string;    // 가나다 인덱스용 (첫 자모)
}

/**
 * 한글 글자에서 초성 추출
 * 가나다라마바사아자차카타파하 그룹으로 매핑
 */
export function getChosung(text: string): string {
  if (!text) return "#";
  const first = text.charCodeAt(0);
  // 한글 음절 범위: 0xAC00 ~ 0xD7A3
  if (first < 0xac00 || first > 0xd7a3) return "#";
  const choseongIdx = Math.floor((first - 0xac00) / 588);
  const choseong = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  return choseong[choseongIdx] ?? "#";
}

/**
 * 4호선 전체 역 (당고개 → 오이도 순)
 * 데이터 출처: 서울교통공사 + 한국철도공사 코레일 (안산선 구간)
 */
export const LINE_4_STATIONS: StationInfo[] = [
  { name: "당고개", chosung: "ㄷ" },
  { name: "상계", chosung: "ㅅ" },
  { name: "노원", chosung: "ㄴ", isTransfer: true },
  { name: "창동", chosung: "ㅊ", isTransfer: true },
  { name: "쌍문", chosung: "ㅅ" },
  { name: "수유", chosung: "ㅅ" },
  { name: "미아", chosung: "ㅁ" },
  { name: "미아사거리", chosung: "ㅁ" },
  { name: "길음", chosung: "ㄱ" },
  { name: "성신여대입구", chosung: "ㅅ", isTransfer: true },
  { name: "한성대입구", chosung: "ㅎ" },
  { name: "혜화", chosung: "ㅎ" },
  { name: "동대문", chosung: "ㄷ", isTransfer: true },
  { name: "동대문역사문화공원", chosung: "ㄷ", isTransfer: true },
  { name: "충무로", chosung: "ㅊ", isTransfer: true },
  { name: "명동", chosung: "ㅁ" },
  { name: "회현", chosung: "ㅎ" },
  { name: "서울역", chosung: "ㅅ", isTransfer: true },
  { name: "숙대입구", chosung: "ㅅ" },
  { name: "삼각지", chosung: "ㅅ", isTransfer: true },
  { name: "신용산", chosung: "ㅅ" },
  { name: "이촌", chosung: "ㅇ", isTransfer: true },
  { name: "동작", chosung: "ㄷ", isTransfer: true },
  { name: "이수", chosung: "ㅇ" }, // 정식 표기: 총신대입구(이수)
  { name: "사당", chosung: "ㅅ", isTransfer: true },
  { name: "남태령", chosung: "ㄴ" },
  { name: "선바위", chosung: "ㅅ" },
  { name: "경마공원", chosung: "ㄱ" },
  { name: "대공원", chosung: "ㄷ" },
  { name: "과천", chosung: "ㄱ" },
  { name: "정부과천청사", chosung: "ㅈ" },
  { name: "인덕원", chosung: "ㅇ" },
  { name: "평촌", chosung: "ㅍ" },
  { name: "범계", chosung: "ㅂ" },
  { name: "금정", chosung: "ㄱ", isTransfer: true },
  { name: "산본", chosung: "ㅅ" },
  { name: "수리산", chosung: "ㅅ" },
  { name: "대야미", chosung: "ㄷ" },
  { name: "반월", chosung: "ㅂ" },
  { name: "상록수", chosung: "ㅅ" },
  { name: "한대앞", chosung: "ㅎ", isTransfer: true },
  { name: "중앙", chosung: "ㅈ" },
  { name: "고잔", chosung: "ㄱ" },
  { name: "초지", chosung: "ㅊ", isTransfer: true },
  { name: "안산", chosung: "ㅇ" },
  { name: "신길온천", chosung: "ㅅ" },
  { name: "정왕", chosung: "ㅈ" },
  { name: "오이도", chosung: "ㅇ" },
];

/**
 * 가나다 인덱스용 자모 순서
 */
export const CHOSUNG_ORDER = ["ㄱ", "ㄴ", "ㄷ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅍ", "ㅎ"];

// ─────────────────────────────────────────────────────────────────────
// 운행 순서 / 종착역 / 방면 계산을 위한 헬퍼
//
// 4호선 운행 순서는 LINE_4_STATIONS 배열 index 그대로 사용:
//   당고개(0) ←──상행──── ... ────하행──→ 오이도(46)
//
// 방면(direction) 표현:
//   - "당고개행" = 상행 (배열 index 감소 방향)
//   - "오이도행" = 하행 (배열 index 증가 방향)
//
// ⚠️ Phase 1 단순화: 실제 4호선엔 사당/안산/한대앞 등 단축 운행 종착역이 있지만,
//   Phase 1에선 양 끝 두 종착역(당고개/오이도)만 표시. 추후 실제 운행 데이터 들어오면 정교화.
// ─────────────────────────────────────────────────────────────────────

/**
 * 4호선 종착역 (양 끝 — Phase 1 기준)
 */
export const TERMINUS_UP = "당고개";   // 상행 종착 (index 0)
export const TERMINUS_DOWN = "오이도";  // 하행 종착 (index 46)

/**
 * 사용자 친화적 종착역 목록 — Phase 2에서 단축 운행(사당/안산/한대앞) 추가 예정
 */
export const ALL_TERMINI = [TERMINUS_UP, TERMINUS_DOWN] as const;

/**
 * 역 이름으로 운행 순서(index) 조회
 * 못 찾으면 -1 반환
 */
export function getStationOrder(name: string): number {
  return LINE_4_STATIONS.findIndex((s) => s.name === name);
}

/**
 * 역 이름으로 StationInfo 조회
 */
export function getStationByName(name: string): StationInfo | undefined {
  return LINE_4_STATIONS.find((s) => s.name === name);
}

/**
 * 특정 역에서 갈 수 있는 종착역 두 곳을 반환
 * 어디서든 양 끝 종착역까지 갈 수 있다고 가정 (Phase 1)
 * @returns { up: "당고개", down: "오이도" } 또는 본인이 종착역이면 한 쪽만
 */
export function getReachableTermini(fromStation: string): {
  up?: string;
  down?: string;
} {
  const order = getStationOrder(fromStation);
  if (order < 0) return {};
  return {
    up: order > 0 ? TERMINUS_UP : undefined,
    down: order < LINE_4_STATIONS.length - 1 ? TERMINUS_DOWN : undefined,
  };
}
