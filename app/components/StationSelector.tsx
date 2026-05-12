// 출발역 선택 카드 — 큰 탭 영역
// 탭하면 StationPickerScreen으로 이동
// 역 이름 옆에 호선 점(LineBadges variant="dot") 표시.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TRANSFER_STATIONS, type LineKey } from "../constants/lines";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import LineBadges from "./LineBadges";

interface Props {
  station: string;
  /** 명시적 호선들 — 없으면 TRANSFER_STATIONS lookup으로 자동 (4호선 기본) */
  lines?: LineKey[];
  onPress: () => void;
}

export default function StationSelector({ station, lines, onPress }: Props) {
  // 명시되지 않으면: 환승역이면 모든 호선, 아니면 ['4'] (앱이 4호선 가정 상태)
  const resolvedLines: LineKey[] = lines ?? TRANSFER_STATIONS[station] ?? ["4"];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: colors.surfaceElevated },
      ]}
      android_ripple={{ color: colors.surfaceElevated, borderless: false }}
    >
      <View style={styles.inner}>
        <View style={styles.left}>
          <Text style={styles.label}>출발역</Text>
          <View style={styles.stationRow}>
            <Text style={styles.station}>{station}</Text>
            <View style={styles.lineDots}>
              <LineBadges lines={resolvedLines} variant="dot" />
            </View>
          </View>
        </View>
        <Text style={styles.chevron}>▾</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  inner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: { flex: 1 },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  // 역 이름 + 호선 점 한 줄
  stationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  station: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 22,
  },
  lineDots: {
    marginLeft: spacing.sm,
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
});
