// 방면 토글 (당고개행 / 오이도행)
//
// 시각 상태 3가지:
//   - active   : 선택됨 (시안 보더 + 시안 글씨 + 시안 10% 배경 + weight 600)
//   - inactive : 미선택   (회색 보더 + 흰색 글씨 + 표면 배경 + weight 500)
//   - disabled : 본인이 종착역이라 못 감 (35% 투명 + 회색 글씨)
//
// 이전 버그: active 스타일이 풀리지 않고 두 칩 모두 시안색으로 남던 문제
// 해결: 조건부 추가(`active && styles.X`) → 명시적 삼항(`active ? styles.X : styles.Y`)으로 교체
//   → 비활성 칩에 inactive 스타일이 *반드시* 적용되어 색이 leakage 안 됨

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  getReachableTermini,
  TERMINUS_DOWN,
  TERMINUS_UP,
} from "../constants/line4Stations";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import type { Direction } from "../utils/directionCalculator";

interface Props {
  /** 출발역 — 갈 수 있는 방면 결정용 */
  fromStation: string;
  /** 현재 선택된 방면 (null이면 미선택) */
  selected: Direction | null;
  /** 토글 콜백. 같은 걸 다시 누르면 null 전달 */
  onChange: (d: Direction | null) => void;
}

interface ChipProps {
  label: string;
  hint: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}

function Chip({ label, hint, active, disabled, onPress }: ChipProps) {
  // 우선순위: disabled > active > inactive
  // 명시적 분기로 RN의 인라인 스타일 캐싱 가능성 차단
  const chipStateStyle = disabled
    ? styles.chipDisabled
    : active
    ? styles.chipActive
    : styles.chipInactive;

  const labelStateStyle = disabled
    ? styles.labelDisabled
    : active
    ? styles.labelActive
    : styles.labelInactive;

  const hintStateStyle = disabled
    ? styles.hintDisabled
    : active
    ? styles.hintActive
    : styles.hintInactive;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        chipStateStyle,
        pressed && !disabled && { opacity: 0.85 },
      ]}
      android_ripple={
        disabled
          ? undefined
          : {
              color: active ? colors.accent + "40" : colors.surfaceElevated,
              borderless: false,
            }
      }
    >
      <Text style={[styles.label, labelStateStyle]}>{label}</Text>
      <Text style={[styles.hint, hintStateStyle]}>{hint}</Text>
    </Pressable>
  );
}

export default function DirectionToggle({ fromStation, selected, onChange }: Props) {
  const reachable = getReachableTermini(fromStation);
  const toggle = (d: Direction) => onChange(selected === d ? null : d);

  return (
    <View style={styles.row}>
      <Chip
        label={`${TERMINUS_UP}행`}
        hint="상행"
        active={selected === "up"}
        disabled={!reachable.up}
        onPress={() => toggle("up")}
      />
      <Chip
        label={`${TERMINUS_DOWN}행`}
        hint="하행"
        active={selected === "down"}
        disabled={!reachable.down}
        onPress={() => toggle("down")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  // chip 공통
  chip: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    borderWidth: 1.5,
  },

  // chip 상태별 — 명시적 (active/inactive/disabled 모두 정의해 leakage 차단)
  chipActive: {
    backgroundColor: colors.accent + "1A", // 약 10% opacity
    borderColor: colors.accent,
  },
  chipInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipDisabled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    opacity: 0.35,
  },

  // label 공통
  label: {
    ...typography.bodyLg,
  },

  // label 상태별
  labelActive: {
    color: colors.accent,
    fontWeight: "600",
  },
  labelInactive: {
    color: colors.textPrimary,
    fontWeight: "500",
  },
  labelDisabled: {
    color: colors.textTertiary,
    fontWeight: "500",
  },

  // hint 공통
  hint: {
    ...typography.micro,
    marginTop: 2,
  },

  // hint 상태별
  hintActive: { color: colors.accent },
  hintInactive: { color: colors.textSecondary },
  hintDisabled: { color: colors.textTertiary },
});
