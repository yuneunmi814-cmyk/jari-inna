// 경로 즐겨찾기 AsyncStorage 래퍼
//
// 새 키 사용: '@jari-inna/favorite-routes'
// 기존 단순 역 즐겨찾기 키('@jari-inna/favorites')와 분리되어 데이터 충돌 없음.
//
// 모든 함수는 비동기 + 에러 시 빈 배열/no-op 반환 (UI 깨짐 방지).

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  FavoriteRoute,
  FavoriteRouteUpdate,
  NewFavoriteRoute,
} from "../types/favorites";

const STORAGE_KEY = "@jari-inna/favorite-routes";

/**
 * 고유 ID 생성 — timestamp + 짧은 랜덤 (uuid 라이브러리 없이도 충분히 unique)
 */
export function makeRouteId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 저장된 모든 경로 즐겨찾기 조회
 * 손상된 데이터나 read 에러 시 빈 배열 반환
 */
export async function getFavorites(): Promise<FavoriteRoute[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 최소 필드 검증
    return parsed.filter(
      (r: any) =>
        r && typeof r.id === "string" && typeof r.label === "string" &&
        typeof r.departure === "string" && typeof r.destination === "string"
    ) as FavoriteRoute[];
  } catch {
    return [];
  }
}

/**
 * 전체 저장 (내부용)
 */
async function saveAll(routes: FavoriteRoute[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}

/**
 * 새 경로 추가 (자동 id/createdAt)
 * 중복(같은 출발/도착) 체크는 안 함 — 같은 경로에 다른 라벨 가능 ("출근"/"점심약속")
 */
export async function addFavorite(route: NewFavoriteRoute): Promise<FavoriteRoute> {
  const list = await getFavorites();
  const newItem: FavoriteRoute = {
    ...route,
    id: makeRouteId(),
    createdAt: Date.now(),
  };
  await saveAll([newItem, ...list]); // 최신순 정렬
  return newItem;
}

/**
 * id로 경로 삭제
 */
export async function deleteFavorite(id: string): Promise<void> {
  const list = await getFavorites();
  await saveAll(list.filter((r) => r.id !== id));
}

/**
 * id로 경로 부분 업데이트 (라벨/아이콘/출발/도착 등)
 */
export async function updateFavorite(
  id: string,
  updates: FavoriteRouteUpdate
): Promise<void> {
  const list = await getFavorites();
  await saveAll(list.map((r) => (r.id === id ? { ...r, ...updates } : r)));
}
