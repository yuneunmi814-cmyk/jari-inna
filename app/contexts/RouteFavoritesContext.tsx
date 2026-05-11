// 경로 즐겨찾기 Context (도쿄메트로 my! 패턴)
//
// utils/favoritesStorage를 감싸 메모리 state와 AsyncStorage를 동기화.
// 기존 FavoritesContext(단순 역)와 별개 시스템 — 둘 다 동작.

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  addFavorite as addToStorage,
  deleteFavorite as deleteFromStorage,
  getFavorites as loadFromStorage,
  updateFavorite as updateInStorage,
} from "../utils/favoritesStorage";
import type {
  FavoriteRoute,
  FavoriteRouteUpdate,
  NewFavoriteRoute,
} from "../types/favorites";

type Value = {
  routes: FavoriteRoute[];
  ready: boolean;

  /** 새 경로 추가 — 라벨/아이콘/출발/도착 입력 받음 */
  addRoute: (input: NewFavoriteRoute) => Promise<FavoriteRoute>;

  /** id로 삭제 */
  removeRoute: (id: string) => Promise<void>;

  /** id로 부분 업데이트 */
  editRoute: (id: string, updates: FavoriteRouteUpdate) => Promise<void>;

  /** 출발/도착 페어가 이미 즐겨찾기에 있는지 (HomeScreen 버튼 활성 결정용) */
  hasRoute: (departure: string, destination: string) => boolean;
};

const RouteFavoritesContext = createContext<Value | null>(null);

export function RouteFavoritesProvider({ children }: { children: React.ReactNode }) {
  const [routes, setRoutes] = useState<FavoriteRoute[]>([]);
  const [ready, setReady] = useState(false);

  // 앱 시작 시 한 번 로드
  useEffect(() => {
    loadFromStorage()
      .then(setRoutes)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const addRoute = useCallback(async (input: NewFavoriteRoute) => {
    const newRoute = await addToStorage(input);
    setRoutes((prev) => [newRoute, ...prev]);
    return newRoute;
  }, []);

  const removeRoute = useCallback(async (id: string) => {
    await deleteFromStorage(id);
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const editRoute = useCallback(async (id: string, updates: FavoriteRouteUpdate) => {
    await updateInStorage(id, updates);
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const hasRoute = useCallback(
    (departure: string, destination: string) =>
      routes.some((r) => r.departure === departure && r.destination === destination),
    [routes]
  );

  return (
    <RouteFavoritesContext.Provider
      value={{ routes, ready, addRoute, removeRoute, editRoute, hasRoute }}
    >
      {children}
    </RouteFavoritesContext.Provider>
  );
}

export function useRouteFavorites(): Value {
  const ctx = useContext(RouteFavoritesContext);
  if (!ctx) {
    throw new Error("useRouteFavorites는 RouteFavoritesProvider 안에서만 사용 가능합니다");
  }
  return ctx;
}
