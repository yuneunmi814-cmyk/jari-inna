// 경로 단위 즐겨찾기 타입 (도쿄메트로 my! 패턴)
//
// 기존 단순 역 즐겨찾기(FavoritesContext)와는 별개:
//   - 단순 역: StationPickerScreen의 "자주 가는 역" 섹션에서만 사용
//   - 경로 즐겨찾기 (이 타입): FavoritesScreen + HomeScreen 연동
//
// 이 둘은 AsyncStorage 키가 달라서 데이터 충돌 없음.

/**
 * 사용자가 등록한 자주 가는 경로 1개
 * 예: { label: "출근", icon: "🏠", departure: "사당", destination: "강남", ... }
 */
export interface FavoriteRoute {
  id: string;          // 고유 ID (timestamp + random)
  label: string;       // "출근", "퇴근", "본가" 등 사용자 정의 이름
  icon: string;        // 이모지 1개 (🏠 💼 ⭐ ❤️ 🚇 🎯 등)
  departure: string;   // 출발역 이름 (예: "사당")
  destination: string; // 도착역 이름 (예: "강남")
  createdAt: number;   // 생성 시각 (정렬용)
}

/**
 * 새 경로 추가 시 사용자가 입력하는 필드 (id, createdAt은 자동 생성)
 */
export type NewFavoriteRoute = Omit<FavoriteRoute, "id" | "createdAt">;

/**
 * 부분 업데이트 (라벨/아이콘만 변경 등)
 */
export type FavoriteRouteUpdate = Partial<Omit<FavoriteRoute, "id" | "createdAt">>;

/**
 * 추천 아이콘 (3개 미니멀)
 * 출퇴근족 핵심 3가지에 집중 — 나머지는 커스텀 입력으로 자유롭게.
 *
 * ⚠️ 기존 즐겨찾기 데이터에 ❤️/🚇/🎯/🍔/📚 등이 저장돼 있어도
 *   FavoriteRoute.icon은 string이라 표시는 그대로 동작 (호환성 유지).
 */
export const FAVORITE_ICON_CHOICES = [
  "⭐", // 즐겨찾기 기본
  "🏠", // 집
  "💼", // 출근/회사
] as const;
