// 자체 스플래시 뷰 — Expo Web/Expo Go/native 모두에서 동작
//
// Expo의 native splash 설정(app.json)은 native build에서만 본격 동작하고,
// Expo Web과 Expo Go에선 거의 안 보이거나 짧게 지나감.
// 이 컴포넌트는 React 트리 안에서 1.5초 직접 표시하여 모든 환경에서 자리잡이를 노출.
//
// App.tsx에서 useState로 짧게 표시한 후 메인 Navigator로 전환.

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  /** 표시 끝났을 때 호출 (App.tsx에서 메인 네비로 전환) */
  onDone: () => void;
  /** 표시 시간 ms (기본 1500) */
  duration?: number;
}

export default function SplashView({ onDone, duration = 1500 }: Props) {
  // 페이드 인 애니메이션 (0 → 1, 400ms)
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [fade, onDone, duration]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fade }]}>
        <Image
          source={require("../assets/icons/jarijabi-icon.png")}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.brand}>시티드</Text>
        <Text style={styles.tagline}>당신을 앉혀드립니다</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { alignItems: "center" },
  icon: {
    width: 160,
    height: 160,
    borderRadius: 36,
    marginBottom: spacing.xl,
  },
  brand: {
    ...typography.h1,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
