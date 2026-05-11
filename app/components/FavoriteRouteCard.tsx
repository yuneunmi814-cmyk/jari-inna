// 즐겨찾기 경로 카드
//
// ⚠️ 중첩 Pressable 회피 — 외부 컨테이너는 View, 본체와 X 버튼은 형제 Pressable.
// 이유: React Native Web의 hit testing은 부모 Pressable에 우선해서
//       자식 Pressable(X)의 onPress가 안 불리는 버그 발생.
//       형제로 분리하면 각자의 hit area가 독립적으로 동작.
//
// 구조:
//   <View card>
//     <Pressable cardMain> ← 카드 본체 (icon + body), 누르면 onUse
//     <Pressable deleteBtn> ← X 버튼, 누르면 onDelete (확인 다이얼로그는 부모가 처리)

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { FavoriteRoute } from "../types/favorites";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  route: FavoriteRoute;
  onUse: () => void;
  onDelete: () => void;
}

export default function FavoriteRouteCard({ route, onUse, onDelete }: Props) {
  return (
    <View style={styles.card}>
      {/* 카드 본체 — 탭 시 onUse (출발/도착 적용) */}
      <Pressable
        onPress={onUse}
        style={({ pressed }) => [
          styles.cardMain,
          pressed && { backgroundColor: colors.surfaceElevated },
        ]}
        android_ripple={{ color: colors.surfaceElevated, borderless: false }}
        accessibilityLabel={`${route.label}: ${route.departure}에서 ${route.destination}으로`}
        accessibilityRole="button"
      >
        {/* 좌측 — 큰 이모지 */}
        <View style={styles.iconBox}>
          <Text style={styles.icon}>{route.icon}</Text>
        </View>

        {/* 가운데 — 라벨 + 경로 */}
        <View style={styles.body}>
          <Text style={styles.label} numberOfLines={1}>
            {route.label}
          </Text>
          <View style={styles.routeRow}>
            <Text style={styles.station} numberOfLines={1}>
              {route.departure}
            </Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.station} numberOfLines={1}>
              {route.destination}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* X 버튼 — 별도 Pressable, 카드 본체와 형제 */}
      <Pressable
        onPress={onDelete}
        hitSlop={16}
        style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
        accessibilityLabel="이 즐겨찾기 삭제"
        accessibilityRole="button"
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // 카드 외곽 — 시각 효과(보더/배경/둥근 모서리)만 담당. 누름 효과 없음.
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden", // ripple/pressed 배경이 둥근 모서리를 넘지 않게
    ...shadows.card,
  },
  // 카드 본체 — Pressable, flex 1로 X 버튼 외 영역 모두 차지
  cardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  icon: { fontSize: 32 },
  body: { flex: 1 },
  label: {
    ...typography.h3,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  routeRow: { flexDirection: "row", alignItems: "center" },
  station: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  arrow: {
    ...typography.caption,
    color: colors.accent,
    marginHorizontal: spacing.sm,
  },
  // X 버튼 — 본체와 형제, 우측 정사각 hit area
  deleteBtn: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    // cardMain과 시각적으로 분리되도록 좌측 얇은 보더
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  deleteIcon: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
