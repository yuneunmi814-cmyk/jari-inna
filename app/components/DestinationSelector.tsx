// 도착역 선택 카드
// - 비어있을 때: "도착역을 골라주세요" (회색 dashed border)
// - 선택됐을 때: 역명 + 방면 자동 계산 결과 + 우측 ✕ 비우기 버튼
// - 탭하면 도착역 picker 열기

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { calculateDirection } from "../utils/directionCalculator";

interface Props {
  /** 출발역 — 방면 계산용 */
  fromStation: string;
  /** 선택된 도착역 (null이면 미선택) */
  destination: string | null;
  /** 카드 탭 — picker 열기 */
  onPress: () => void;
  /** ✕ 버튼 탭 — destination을 null로 */
  onClear: () => void;
}

export default function DestinationSelector({
  fromStation,
  destination,
  onPress,
  onClear,
}: Props) {
  // 비어있을 때
  if (!destination) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.empty,
          pressed && { backgroundColor: colors.surface },
        ]}
        android_ripple={{ color: colors.surface, borderless: false }}
      >
        <Text style={styles.emptyIcon}>📍</Text>
        <Text style={styles.emptyText}>도착역을 골라주세요</Text>
      </Pressable>
    );
  }

  // 선택됐을 때 — 방면 자동 계산
  const dir = calculateDirection(fromStation, destination);
  return (
    <View style={styles.filled}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.filledMain, pressed && { opacity: 0.7 }]}
        android_ripple={{ color: colors.surface, borderless: false }}
      >
        <View>
          <Text style={styles.label}>도착역</Text>
          <Text style={styles.station}>{destination}</Text>
          {dir && (
            <Text style={styles.directionHint}>
              → {dir.label}을(를) 타면 돼요
            </Text>
          )}
        </View>
      </Pressable>
      <Pressable
        onPress={onClear}
        hitSlop={12}
        style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.5 }]}
      >
        <Text style={styles.clearIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // 비어있는 상태 — dashed border로 "입력 필요" 시각화
  empty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  emptyIcon: { fontSize: 18, marginRight: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },

  // 채워진 상태
  filled: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filledMain: { flex: 1, paddingVertical: spacing.xs },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: 2 },
  station: { ...typography.h3, color: colors.textPrimary, fontSize: 20 },
  directionHint: {
    ...typography.caption,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  clearBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  clearIcon: { fontSize: 16, color: colors.textSecondary },
});
