// 출발 ↔ 도착 swap 버튼 (도쿄메트로 my! 패턴)
//
// 44x44 원형 버튼, 가운데에 ⇅ 아이콘.
// 누를 때 180도 회전 애니메이션 (250ms, native driver) → 시각적 피드백.
// disabled(도착역 없음) 시: 35% 투명 + 누름 차단.
//
// 색상은 시안(accent) — 4호선 블루 계열과 어울리는 강조색.

import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";
import { radius } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  disabled?: boolean;
  onPress: () => void;
}

export default function SwapButton({ disabled, onPress }: Props) {
  // 회전 애니메이션 값 (0 → 1로 진행 후 reset)
  const rotation = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (disabled) return;
    // 250ms 회전 → 끝나면 0으로 reset (다음 누름 때 다시 360도 회전 가능)
    Animated.timing(rotation, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      rotation.setValue(0);
    });
    onPress();
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        disabled && styles.btnDisabled,
        pressed && !disabled && { opacity: 0.7, transform: [{ scale: 0.96 }] },
      ]}
      android_ripple={
        disabled ? undefined : { color: colors.accent + "40", borderless: true, radius: 30 }
      }
      accessibilityLabel="출발역과 도착역 바꾸기"
      accessibilityRole="button"
    >
      <Animated.Text
        style={[styles.icon, disabled && styles.iconDisabled, { transform: [{ rotate: spin }] }]}
      >
        ⇅
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.35,
    borderColor: colors.border,
  },
  icon: {
    ...typography.h3,
    fontSize: 22,
    color: colors.accent,
    fontWeight: "700",
    lineHeight: 24,
  },
  iconDisabled: {
    color: colors.textTertiary,
  },
});
