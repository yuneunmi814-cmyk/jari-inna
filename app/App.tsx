// 시티드 앱 진입점
// 구성 순서 (바깥 → 안):
//   GestureHandlerRootView (swipe gesture 동작에 필요, 최상위)
//   → SafeAreaProvider (노치/네비바 여백 제공)
//   → StatusBar (다크모드 + 배경 일치)
//   → 1.5초 SplashView (자리잡이 표시) → 끝나면 메인 네비로 전환
//   → StationProvider / FavoritesProvider (전역 상태)
//   → NavigationContainer
//   → RootNavigator (Stack)

import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SplashView from "./components/SplashView";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { StationProvider } from "./contexts/StationContext";
import { RootNavigator } from "./navigation/RootNavigator";
import { colors } from "./theme/colors";

// React Navigation 다크 테마 (배경색 통일 — 깜빡임 방지)
const navTheme = {
  dark: true,
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
  // 자체 splash 표시 여부 — 1.5초 후 false로 전환되며 메인 앱 노출
  const [showSplash, setShowSplash] = useState(true);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={colors.background} />
        {showSplash ? (
          <SplashView onDone={() => setShowSplash(false)} />
        ) : (
          <StationProvider>
            <FavoritesProvider>
              <NavigationContainer theme={navTheme}>
                <RootNavigator />
              </NavigationContainer>
            </FavoritesProvider>
          </StationProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
