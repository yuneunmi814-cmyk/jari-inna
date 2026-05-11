// 하단 빠른 액션 3개 (역 검색 / 즐겨찾기 / 환승 안내)

import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  onSearchPress: () => void;
  onFavoritesPress: () => void;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function ActionButton({ icon, label, onPress, disabled }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        disabled && styles.disabled,
        pressed && !disabled && { backgroundColor: colors.surfaceElevated },
      ]}
      android_ripple={
        disabled ? undefined : { color: colors.surfaceElevated, borderless: false }
      }
    >
      <Text style={[styles.icon, disabled && { opacity: 0.4 }]}>{icon}</Text>
      <Text style={[styles.label, disabled && { color: colors.textTertiary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function QuickActions({ onSearchPress, onFavoritesPress }: Props) {
  return (
    <View style={styles.row}>
      <ActionButton icon="🔍" label="역 검색" onPress={onSearchPress} />
      <ActionButton icon="⭐" label="즐겨찾기" onPress={onFavoritesPress} />
      <ActionButton
        icon="📍"
        label="환승 안내"
        onPress={() => Alert.alert("준비 중", "Phase 3에서 만나요!")}
        disabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  btn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: { opacity: 0.6 },
  icon: { fontSize: 24, marginBottom: spacing.sm },
  label: { ...typography.caption, color: colors.textPrimary, fontWeight: "500" },
});
