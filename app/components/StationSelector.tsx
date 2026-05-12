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
  /** 명시적 호선들 — 호출자가 departureLine 등 컨텍스트 정보로 전달.
   *  생략 시 TRANSFER_STATIONS lookup, 그래도 없으면 dot 안 보임. */
  lines?: LineKey[];
  onPress: () => void;
}

export default function StationSelector({ station, lines, onPress }: Props) {
  // 명시 전달 우선 → 환승역 lookup → 빈 배열(dot 안 보임).
  // ⚠️ 과거 ['4'] fallback 있었음 — 2호선 강남 등 단일호선 역에서 4호선 dot 잘못 표시되는
  //    버그 유발. 호출자가 항상 LineKey 전달하게 함 (HomeScreen에서 departureLine 사용).
  const resolvedLines: LineKey[] = lines ?? TRANSFER_STATIONS[station] ?? [];

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
