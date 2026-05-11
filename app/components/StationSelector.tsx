// 출발역 선택 카드 — 큰 탭 영역
// 탭하면 StationPickerScreen으로 이동

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  station: string;
  onPress: () => void;
}

export default function StationSelector({ station, onPress }: Props) {
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
        <View>
          <Text style={styles.label}>출발역</Text>
          <Text style={styles.station}>{station}</Text>
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
  },
  inner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  station: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 22,
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
});
