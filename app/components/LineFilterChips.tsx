// 호선 필터 칩 — StationPicker 상단 가로 스크롤
//
// 칩 순서: [전체] [1호선] [2호선] ... [9호선]
//   - 비선택: 흰 배경 + 호선 컬러 보더 + 호선 컬러 글씨
//   - 선택:   호선 컬러 fill + 흰 글씨
//   - 검색 중: opacity 0.4 + 누름 차단
//
// ⭐ 칩 width 명시 — RN Web에서 ScrollView horizontal 자식이
//    첫 렌더 시 부모 width로 stretch되는 버그를 완전 차단.
//    flexShrink/Grow 0보다 강력한 보장.

import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LINES, type LineKey } from "../constants/lines";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

/** "all" = 전체 호선 */
export type LineFilterKey = LineKey | "all";

const ORDER: LineFilterKey[] = ["all", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** 칩 명시 width — 텍스트 폭(약 35~40px) + padding 28px + 보더 3px ≈ 66-72 */
const CHIP_WIDTH: Record<LineFilterKey, number> = {
  all: 66,
  "1": 72,
  "2": 72,
  "3": 72,
  "4": 72,
  "5": 72,
  "6": 72,
  "7": 72,
  "8": 72,
  "9": 72,
};

interface Props {
  selected: LineFilterKey;
  onChange: (key: LineFilterKey) => void;
  /** 검색 중이면 칩 비활성 (시각적 흐림 + 누름 차단) */
  disabled?: boolean;
}

export default function LineFilterChips({ selected, onChange, disabled }: Props) {
  return (
    // View 감싸기 — ScrollView width를 부모 flex와 분리
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {ORDER.map((key, idx) => (
          <Chip
            key={key}
            filterKey={key}
            active={selected === key}
            disabled={disabled}
            isLast={idx === ORDER.length - 1}
            onPress={() => onChange(key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface ChipProps {
  filterKey: LineFilterKey;
  active: boolean;
  disabled?: boolean;
  isLast?: boolean;
  onPress: () => void;
}

function Chip({ filterKey, active, disabled, isLast, onPress }: ChipProps) {
  const isAll = filterKey === "all";
  const color = isAll ? colors.textSecondary : colors[LINES[filterKey].colorKey];
  const label = isAll ? "전체" : LINES[filterKey].name;
  const width = CHIP_WIDTH[filterKey];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        { width, borderColor: color }, // ⭐ width 명시
        !isLast && styles.chipSpacing,
        active && { backgroundColor: color },
        disabled && styles.chipDisabled,
        pressed && !disabled && !active && { backgroundColor: color + "1A" },
      ]}
      android_ripple={
        disabled ? undefined : { color: color + "30", borderless: false }
      }
      accessibilityLabel={`${label} 필터`}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? "#FFFFFF" : color },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 60,
  },
  scroll: {
    height: 60,
    flexGrow: 0,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  // 칩 본체 — height/width 모두 고정 (stretch 차단)
  chip: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    flexGrow: 0,
  },
  chipSpacing: {
    marginRight: 8,
  },
  chipDisabled: {
    opacity: 0.4,
  },

  chipText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },
});
