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
