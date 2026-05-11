// 빠른 출발 카드 — 즐겨찾기 1개를 작은 가로 스크롤 아이템으로 표시
//
// 두 모드:
//   - 보기 모드 (기본): 카드 탭 → onPress (즐겨찾기 적용)
//   - 편집 모드 (isEditMode): 카드 탭 비활성 + 좌상단 X(삭제) / 우상단 ✏️(수정) 등장
//
// 중첩 Pressable 회피 — X/✏️는 카드 본체 Pressable과 형제로,
// 외부 컨테이너 View 안에 absolute 배치 (FavoriteRouteCard와 동일 패턴).

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { FavoriteRoute } from "../types/favorites";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  route: FavoriteRoute;
  /** 평소 카드 탭 동작 (즐겨찾기 적용) */
  onPress: () => void;
  /** 편집 모드 여부 — true면 카드 탭 비활성 + X/✏️ 버튼 표시 */
  isEditMode?: boolean;
  /** 편집 모드 — X 탭 (삭제) */
  onDelete?: () => void;
  /** 편집 모드 — ✏️ 탭 (수정) */
  onEdit?: () => void;
}

export default function QuickStartCard({
  route,
  onPress,
  isEditMode,
  onDelete,
  onEdit,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={isEditMode ? undefined : onPress}
        disabled={isEditMode}
        style={({ pressed }) => [
          styles.card,
          pressed && !isEditMode && { backgroundColor: colors.surfaceElevated },
          isEditMode && styles.cardEditing,
        ]}
        android_ripple={
          isEditMode ? undefined : { color: colors.rippleOnSurface, borderless: false }
        }
        accessibilityLabel={`${route.label}: ${route.departure}에서 ${route.destination}으로`}
        accessibilityRole="button"
      >
        <Text style={styles.icon}>{route.icon}</Text>
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
      </Pressable>

      {/* 편집 모드 — X / ✏️ 버튼 (absolute, 형제로 중첩 Pressable 회피) */}
      {isEditMode && (
        <>
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel={`${route.label} 삭제`}
            accessibilityRole="button"
          >
            <Text style={styles.deleteIcon}>✕</Text>
          </Pressable>
          <Pressable
            onPress={onEdit}
            hitSlop={8}
            style={({ pressed }) => [
              styles.editBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel={`${route.label} 수정`}
            accessibilityRole="button"
          >
            <Text style={styles.editIcon}>✏️</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const BTN_SIZE = 26;

const styles = StyleSheet.create({
  wrap: {
    width: 156,
    // 편집 버튼이 카드 모서리에서 살짝 튀어나오기 때문에 padding 여유로 잘림 방지
    paddingTop: 4,
  },
  card: {
    minHeight: 104,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "space-between",
    ...shadows.card,
  },
  // 편집 중인 카드 — 살짝 어둡게 (편집 중 시각 힌트)
  cardEditing: {
    opacity: 0.92,
  },
  icon: { fontSize: 26 },
  label: {
    ...typography.bodyLg,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  station: {
    ...typography.micro,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  arrow: {
    ...typography.micro,
    color: colors.accent,
    fontWeight: "700",
    marginHorizontal: 3,
  },

  // 좌상단 X — 빨강 원
  deleteBtn: {
    position: "absolute",
    top: 0,
    left: -4,
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    ...shadows.elevated,
  },
  deleteIcon: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
    lineHeight: 14,
  },

  // 우상단 ✏️ — 회색 원
  editBtn: {
    position: "absolute",
    top: 0,
    right: -4,
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    ...shadows.elevated,
  },
  editIcon: {
    fontSize: 12,
    lineHeight: 14,
  },
});
