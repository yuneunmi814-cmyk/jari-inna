// 홈 화면 상단 헤더
// 좌측 로고 + 우측 설정 진입 햄버거(☰) + 그 아래 시간대별 인사
//
// 햄버거 컬러: #00A4E4 (시티드 브랜드 블루 — 앱 아이콘/스플래시와 동일)
// 탭 영역: 24pt 아이콘 + 44x44 최소 영역 + hitSlop 12 → iOS HIG 충족

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * 시간대별 친근한 인사말
 * 출퇴근/심야/일과 시간에 맞춰 분위기 다르게
 */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return "오늘 출근길도 화이팅이에요";
  if (h >= 10 && h < 17) return "안녕! 오늘도 좋은 자리 잡아봐요";
  if (h >= 17 && h < 21) return "퇴근길, 오늘 하루도 수고했어요";
  if (h >= 21 && h < 24) return "야근하셨나요? 안전한 자리 골라봐요";
  return "이 시간에도 화이팅이에요";
}

export default function Header() {
  const navigation = useNavigation<NavProp>();
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.logo}>🚇 시티드</Text>
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          hitSlop={12}
          accessibilityLabel="설정 열기"
          accessibilityRole="button"
          style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
      </View>
      <Text style={styles.greeting}>{getGreeting()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    ...typography.h2,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  menuBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: {
    fontSize: 24,
    lineHeight: 28,
    color: "#00A4E4", // 시티드 브랜드 블루 (앱 아이콘과 동일)
    fontWeight: "700",
  },
  greeting: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
