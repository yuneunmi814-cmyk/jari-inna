// 시티드 앱 진입점
// 구성 순서 (바깥 → 안):
//   GestureHandlerRootView (swipe gesture 동작에 필요, 최상위)
//   → SafeAreaProvider (노치/네비바 여백 제공)
//   → StatusBar (다크모드 + 배경 일치)
//   → StationProvider / FavoritesProvider (전역 상태)
//   → NavigationContainer
//   → RootNavigator (Stack)
//
// 스플래시:
//   Expo 네이티브 splash (./assets/splash.png + #00A4E4) 만 사용.
//   별도 자바스크립트 SplashView 는 제거 — 진입 속도 1-2초 단축.

import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { RouteFavoritesProvider } from "./contexts/RouteFavoritesContext";
import { StationProvider } from "./contexts/StationContext";
import { RootNavigator } from "./navigation/RootNavigator";
import { colors } from "./theme/colors";

// React Navigation 라이트 테마 (배경색 통일 — 깜빡임 방지)
const navTheme = {
  dark: false,
  colors: {
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" as const },
    medium: { fontFamily: "System", fontWeight: "500" as const },
    bold: { fontFamily: "System", fontWeight: "700" as const },
    heavy: { fontFamily: "System", fontWeight: "900" as const },
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <StationProvider>
          <FavoritesProvider>
            <RouteFavoritesProvider>
              <NavigationContainer theme={navTheme}>
                <RootNavigator />
              </NavigationContainer>
            </RouteFavoritesProvider>
          </FavoritesProvider>
        </StationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
