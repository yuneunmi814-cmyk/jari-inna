// 역 1개 리스트 아이템
// 구성:
//   좌측: 역명 (큰 글씨) + 환승역 뱃지 + 현재 선택 표시
//   우측: ⭐ 즐겨찾기 토글 (별도 터치 영역, hitSlop 확장)
// 본체 누름과 ⭐ 누름이 분리되어 각자 동작.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LineKey } from "../constants/lines";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import LineBadges from "./LineBadges";

interface Props {
  name: string;
  isTransfer?: boolean;
  isCurrent?: boolean;
  isFavorite?: boolean;
  /**
   * 이 역이 속한 호선들 (LineBadges 표시용).
   * 단일 호선 = [그 호선], 환승역 = 여러 호선.
   * 생략 시 기존 "환승" 텍스트 뱃지 fallback (backward compatible).
   */
  lines?: LineKey[];
  /** 비활성 표시 — 예: 도착역 선택 모드에서 출발역과 같은 역 */
  disabled?: boolean;
  /** 비활성 사유 우측에 표시 (예: "출발역") */
  disabledHint?: string;
  onPress: () => void;
  onToggleFavorite?: () => void;
}

export default function StationListItem({
  name,
  isTransfer,
  isCurrent,
  isFavorite,
  lines,
  disabled,
  disabledHint,
  onPress,
  onToggleFavorite,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.rowDisabled,
        pressed && !disabled && { backgroundColor: colors.surface },
      ]}
      android_ripple={disabled ? undefined : { color: colors.surface, borderless: false }}
    >
      <View style={styles.left}>
        <Text
          style={[
            styles.name,
            isCurrent && styles.nameCurrent,
            disabled && styles.nameDisabled,
          ]}
        >
          {name}
        </Text>
        {/* 호선 뱃지 — lines prop 우선, 없으면 기존 "환승" 텍스트 fallback */}
        {lines && lines.length > 0 ? (
          <View style={styles.lineBadges}>
            <LineBadges lines={lines} variant="badge" />
          </View>
        ) : isTransfer ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>환승</Text>
          </View>
        ) : null}
        {isCurrent && <Text style={styles.currentDot}>·</Text>}
        {isCurrent && <Text style={styles.currentLabel}>현재</Text>}
        {disabled && disabledHint && (
          <Text style={styles.disabledHint}>{disabledHint}</Text>
        )}
      </View>

      {onToggleFavorite && !disabled && (
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={12}
          style={({ pressed }) => [styles.starBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={[styles.star, isFavorite && styles.starOn]}>
            {isFavorite ? "⭐" : "☆"}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  rowDisabled: { opacity: 0.45 },
  left: { flexDirection: "row", alignItems: "center", flex: 1, flexWrap: "wrap" },
  name: { ...typography.h3, color: colors.textPrimary, fontSize: 18 },
  nameCurrent: { color: colors.accent },
  nameDisabled: { color: colors.textTertiary },
  disabledHint: {
    ...typography.micro,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  // 호선 뱃지 그룹 컨테이너 (LineBadges 좌측 여유)
  lineBadges: {
    marginLeft: spacing.sm,
  },
  // 기존 "환승" 텍스트 뱃지 fallback (lines 미전달 시)
  badge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.line4 + "20",
  },
  badgeText: { ...typography.micro, color: colors.line4, fontWeight: "600" },
  currentDot: { color: colors.accent, marginHorizontal: spacing.sm, fontSize: 16 },
  currentLabel: { ...typography.caption, color: colors.accent, fontWeight: "600" },
  starBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  star: { fontSize: 20, color: colors.textTertiary },
  starOn: { color: colors.warning },
});
