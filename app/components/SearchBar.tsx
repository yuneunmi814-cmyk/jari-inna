// 검색 입력 컴포넌트 — 다크모드 일관성 유지
// 우측에 ✕ 버튼으로 한 번에 비우기 가능

import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "역 이름을 입력해주세요",
  autoFocus,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={styles.input}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        // 안드로이드에서 다크 키보드 가이드라인
        keyboardAppearance="light"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChange("")}
          hitSlop={8}
          style={({ pressed }) => [styles.clear, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.clearIcon}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { fontSize: 16, marginRight: spacing.sm },
  input: {
    flex: 1,
    ...typography.bodyLg,
    color: colors.textPrimary,
    padding: 0, // 안드로이드 기본 padding 제거 (높이 일관성)
    paddingVertical: spacing.xs,
  },
  clear: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearIcon: { fontSize: 14, color: colors.textSecondary },
});
