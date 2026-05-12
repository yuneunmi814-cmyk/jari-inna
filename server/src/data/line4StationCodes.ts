// 4호선 역 코드 매핑 (KRIC 운영기관_역사_코드정보 기반, 2026-05-11)
//
// 50개 역:
//   - 서울교통공사(S1): 26개 (당고개~남태령)
//   - 한국철도공사(KR): 21개 (선바위~오이도, 안산선/과천선)
//   - 남양주도시공사(NA): 3개 (별내별가람~진접, 4호선 연장)
//
// KRIC 정식 역명에 괄호 부수설명 있는 경우(예: "수유(강북구청)") →
// 앱의 단순 역명(예: "수유")으로 lookup 가능하도록 별칭 매핑 포함.

export interface Line4StationCode {
  /** KRIC stinCd (예: "433", "K312") */
  stinCd: string;
  /** KRIC lnCd ("4" 또는 "K4") */
  lnCd: string;
  /** 운영기관 코드 */
  railOprIsttCd: "S1" | "KR" | "NA";
  /** 운영기관 한글명 */
  operator: string;
  /** KRIC 정식 역명 (괄호 포함 가능) */
  kricName: string;
  /** 앱(line4Stations.ts) 표기명 — KRIC 정식명과 다르면 별칭 */
  appName: string;
  /** 운행 순서 인덱스 (당고개=0 ~ 진접=49). Phase 2에서 정확히 정렬 후 활용 */
  orderIndex: number;
}

/**
 * 4호선 전체 50개 역 (KRIC 매핑 + 앱 별칭)
 * orderIndex는 운행 순서 (당고개 방면→오이도 방면 + 연장 진접)
 */
export const LINE_4_STATIONS_KRIC: readonly Line4StationCode[] = [
  // ─── 서울교통공사(S1) 26개: 당고개(불암산) → 남태령 ───
  { stinCd: "409", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "불암산(당고개)", appName: "당고개", orderIndex: 0 },
  { stinCd: "410", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "상계", appName: "상계", orderIndex: 1 },
  { stinCd: "411", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "노원", appName: "노원", orderIndex: 2 },
  { stinCd: "412", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "창동", appName: "창동", orderIndex: 3 },
  { stinCd: "413", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "쌍문", appName: "쌍문", orderIndex: 4 },
  { stinCd: "414", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "수유(강북구청)", appName: "수유", orderIndex: 5 },
  { stinCd: "415", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "미아", appName: "미아", orderIndex: 6 },
  { stinCd: "416", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "미아사거리", appName: "미아사거리", orderIndex: 7 },
  { stinCd: "417", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "길음", appName: "길음", orderIndex: 8 },
  { stinCd: "418", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "성신여대입구(돈암)", appName: "성신여대입구", orderIndex: 9 },
  { stinCd: "419", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "한성대입구(삼선교)", appName: "한성대입구", orderIndex: 10 },
  { stinCd: "420", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "혜화", appName: "혜화", orderIndex: 11 },
  { stinCd: "421", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "동대문", appName: "동대문", orderIndex: 12 },
  { stinCd: "422", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "동대문역사문화공원", appName: "동대문역사문화공원", orderIndex: 13 },
  { stinCd: "423", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "충무로", appName: "충무로", orderIndex: 14 },
  { stinCd: "424", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "명동", appName: "명동", orderIndex: 15 },
  { stinCd: "425", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "회현(남대문시장)", appName: "회현", orderIndex: 16 },
  { stinCd: "426", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "서울역", appName: "서울역", orderIndex: 17 },
  { stinCd: "427", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "숙대입구(갈월)", appName: "숙대입구", orderIndex: 18 },
  { stinCd: "428", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "삼각지", appName: "삼각지", orderIndex: 19 },
  { stinCd: "429", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "신용산", appName: "신용산", orderIndex: 20 },
  { stinCd: "430", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "이촌(국립중앙박물관)", appName: "이촌", orderIndex: 21 },
  { stinCd: "431", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "동작(현충원)", appName: "동작", orderIndex: 22 },
  { stinCd: "432", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "총신대입구(이수)", appName: "이수", orderIndex: 23 },
  { stinCd: "433", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "사당", appName: "사당", orderIndex: 24 },
  { stinCd: "434", lnCd: "4", railOprIsttCd: "S1", operator: "서울교통공사", kricName: "남태령", appName: "남태령", orderIndex: 25 },

  // ─── 한국철도공사(KR) 21개: 선바위 → 오이도 (안산선/과천선) ───
  { stinCd: "435", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "선바위", appName: "선바위", orderIndex: 26 },
  { stinCd: "436", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "경마공원", appName: "경마공원", orderIndex: 27 },
  { stinCd: "437", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "대공원", appName: "대공원", orderIndex: 28 },
  { stinCd: "438", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "과천", appName: "과천", orderIndex: 29 },
  { stinCd: "439", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "정부과천청사", appName: "정부과천청사", orderIndex: 30 },
  { stinCd: "440", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "인덕원", appName: "인덕원", orderIndex: 31 },
  { stinCd: "441", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "평촌", appName: "평촌", orderIndex: 32 },
  { stinCd: "442", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "범계", appName: "범계", orderIndex: 33 },
  { stinCd: "443", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "금정", appName: "금정", orderIndex: 34 },
  { stinCd: "444", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "산본", appName: "산본", orderIndex: 35 },
  { stinCd: "445", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "수리산", appName: "수리산", orderIndex: 36 },
  { stinCd: "446", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "대야미", appName: "대야미", orderIndex: 37 },
  { stinCd: "447", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "반월", appName: "반월", orderIndex: 38 },
  { stinCd: "448", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "상록수", appName: "상록수", orderIndex: 39 },
  { stinCd: "449", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "한대앞", appName: "한대앞", orderIndex: 40 },
  { stinCd: "450", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "중앙", appName: "중앙", orderIndex: 41 },
  { stinCd: "451", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "고잔", appName: "고잔", orderIndex: 42 },
  { stinCd: "452", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "초지", appName: "초지", orderIndex: 43 },
  { stinCd: "453", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "안산", appName: "안산", orderIndex: 44 },
  { stinCd: "454", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "신길온천", appName: "신길온천", orderIndex: 45 },
  { stinCd: "455", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "정왕", appName: "정왕", orderIndex: 46 },
  { stinCd: "456", lnCd: "4", railOprIsttCd: "KR", operator: "한국철도공사", kricName: "오이도", appName: "오이도", orderIndex: 47 },

  // ─── 남양주도시공사(NA) 3개: 4호선 진접 연장 (당고개 너머) ───
  // ⚠️ 앱 line4Stations.ts에 아직 없는 역들. Phase 2에서 앱 station list 보강 시 추가.
  { stinCd: "408", lnCd: "4", railOprIsttCd: "NA", operator: "남양주도시공사", kricName: "별내별가람", appName: "별내별가람", orderIndex: 48 },
  { stinCd: "406", lnCd: "4", railOprIsttCd: "NA", operator: "남양주도시공사", kricName: "오남", appName: "오남", orderIndex: 49 },
  { stinCd: "405", lnCd: "4", railOprIsttCd: "NA", operator: "남양주도시공사", kricName: "진접", appName: "진접", orderIndex: 50 },
] as const;

// ─────────────────────────────────────────────────────────────────
// Lookup 헬퍼
// ─────────────────────────────────────────────────────────────────

/**
 * 역명 → 코드. 앱명, KRIC 정식명, 별칭 모두 시도.
 *   예: "사당", "이수", "총신대입구(이수)", "총신대입구" 모두 동작
 */
export function findByName(name: string): Line4StationCode | undefined {
  if (!name) return undefined;
  const norm = name.trim();
  // 1. appName 정확 일치
  let hit = LINE_4_STATIONS_KRIC.find((s) => s.appName === norm);
  if (hit) return hit;
  // 2. kricName 정확 일치
  hit = LINE_4_STATIONS_KRIC.find((s) => s.kricName === norm);
  if (hit) return hit;
  // 3. kricName에서 괄호 앞 부분 일치 (예: "총신대입구" → "총신대입구(이수)")
  hit = LINE_4_STATIONS_KRIC.find((s) => s.kricName.startsWith(`${norm}(`));
  if (hit) return hit;
  // 4. kricName 괄호 안 일치 (예: "당고개" → "불암산(당고개)")
  hit = LINE_4_STATIONS_KRIC.find((s) =>
    s.kricName.includes(`(${norm})`)
  );
  return hit;
}

/**
 * stinCd로 역 찾기
 */
export function findByCode(stinCd: string): Line4StationCode | undefined {
  return LINE_4_STATIONS_KRIC.find((s) => s.stinCd === stinCd);
}

/**
 * 운영기관 코드(railOprIsttCd)별 역 목록
 */
export function listByOperator(
  railOprIsttCd: "S1" | "KR" | "NA"
): Line4StationCode[] {
  return LINE_4_STATIONS_KRIC.filter((s) => s.railOprIsttCd === railOprIsttCd);
}
