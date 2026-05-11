// 빈 상태 표시 (도착 정보 없음 / 즐겨찾기 비어있음 등)
// 외부 일러스트 없이 이모지로 가볍게

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  emoji?: string;
  title: string;
  description?: string;
  compact?: boolean;
}

export default function EmptyState({
  emoji = "🤔",
  title,
  description,
  compact,
}: Props) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  compact: { paddingVertical: spacing.lg },
  emoji: { fontSize: 48, marginBottom: spacing.md },
  title: {
    ...typography.bodyLg,
    color: colors.textPrimary,
    textAlign: "center",
    fontWeight: "600",
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
