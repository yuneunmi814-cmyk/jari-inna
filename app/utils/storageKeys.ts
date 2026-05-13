// AsyncStorage 키 단일 진실 소스
//
// 새 키 추가 시:
//   1) 아래 STORAGE_KEYS 에 항목 추가
//   2) docs/privacy/index.html "기기 내부에 저장되는 설정값" 목록 갱신
//   3) SettingsScreen "데이터 관리" 그룹에 삭제 옵션 노출 (필요 시)
//
// 그룹 분류:
//   - favorites:  사용자가 명시적으로 저장한 즐겨찾기 (역/경로)
//   - recent:     마지막 선택값 (출발역/호선) — UX 편의용 자동 저장
//
// "모든 데이터 초기화" 시 AsyncStorage.clear() 사용 → 위 키 전부 + 외부 라이브러리가
// 보관하는 데이터까지 모두 삭제됨. 시티드는 자체 외부 의존 저장이 없어 안전하지만,
// 의존성 추가 시 이 가정을 재검토할 것.

export const STORAGE_KEYS = {
  selectedStation: "@jari-inna/selected-station",
  departureLine: "@jari-inna/departure-line",
  favoriteStations: "@jari-inna/favorites",
  favoriteRoutes: "@jari-inna/favorite-routes",
} as const;

export const FAVORITE_KEYS = [
  STORAGE_KEYS.favoriteStations,
  STORAGE_KEYS.favoriteRoutes,
] as const;

export const RECENT_KEYS = [
  STORAGE_KEYS.selectedStation,
  STORAGE_KEYS.departureLine,
] as const;
