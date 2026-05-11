// 자리있나 홈 화면 — Phase 1 뼈대
// 추후 4호선 칸별 혼잡도 + 좌석 공유 UI가 여기에 들어옴

import React from "react";
import { StyleSheet, Text, View, SafeAreaView, StatusBar } from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={styles.safe.backgroundColor} />
      <View style={styles.container}>
        <Text style={styles.logo}>🚇</Text>
        <Text style={styles.title}>자리있나</Text>
        <Text style={styles.subtitle}>JariInna</Text>

        <View style={styles.divider} />

        <Text style={styles.description}>
          4호선 칸별 실시간 혼잡도{"\n"}+ 좌석 공유 커뮤니티
        </Text>

        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderLabel}>Phase 1</Text>
          <Text style={styles.placeholderText}>다음 단계에 구현 예정</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// 다크모드 기본 - 색상 팔레트
const COLORS = {
  bg: "#0A0E1A",        // 짙은 남색 (지하철 야간 분위기)
  surface: "#151B2E",
  primary: "#4A9EFF",   // 4호선 라인 컬러(하늘색)에 영감
  text: "#FFFFFF",
  textMuted: "#8B92A8",
  border: "#252B3F",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    letterSpacing: 2,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.primary,
    marginVertical: 24,
    borderRadius: 1,
  },
  description: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 40,
  },
  placeholderBox: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  placeholderLabel: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
});
