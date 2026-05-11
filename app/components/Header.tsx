// 홈 화면 상단 헤더
// 좌측 로고 + 우측 설정 아이콘 + 그 아래 시간대별 인사

import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

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
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.logo}>🚇 시티드</Text>
        <Pressable
          onPress={() => Alert.alert("설정", "Phase 2에 추가 예정입니다")}
          hitSlop={12}
          style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
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
  settingsBtn: { padding: spacing.xs },
  settingsIcon: { fontSize: 22 },
  greeting: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
