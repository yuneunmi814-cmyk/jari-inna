// 즐겨찾기 역 관리 (AsyncStorage 영속화)
// 각 즐겨찾기 항목은 역명 + 평소 이용 시간대(메모)를 함께 저장

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "@jari-inna/favorites";

export interface Favorite {
  id: string;           // 고유 ID (역명 + 추가 시각 기반)
  stationName: string;  // 역 이름
  usualTime?: string;   // 평소 이용 시간대 메모 (예: "출근 08:00")
  addedAt: number;      // 추가 시각 (정렬용)
}

type FavoritesContextValue = {
  favorites: Favorite[];
  addFavorite: (stationName: string, usualTime?: string) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (stationName: string) => boolean;
  ready: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [ready, setReady] = useState(false);

  // 앱 시작 시 저장된 즐겨찾기 복원
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setFavorites(parsed);
        } catch {
          // 손상된 데이터는 무시 (초기화 효과)
        }
      })
      .finally(() => setReady(true));
  }, []);

  // 변경 시마다 저장
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)).catch(() => {
      // 저장 실패해도 메모리 상태는 유지
    });
  }, [favorites, ready]);

  const addFavorite = (stationName: string, usualTime?: string) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.stationName === stationName)) return prev; // 중복 방지
      const newItem: Favorite = {
        id: `${stationName}-${Date.now()}`,
        stationName,
        usualTime,
        addedAt: Date.now(),
      };
      return [newItem, ...prev]; // 최신순
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const isFavorite = (stationName: string) =>
    favorites.some((f) => f.stationName === stationName);

  return (
    <FavoritesContext.Provider
      value={{ favorites, addFavorite, removeFavorite, isFavorite, ready }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites는 FavoritesProvider 안에서만 사용 가능합니다");
  }
  return ctx;
}
