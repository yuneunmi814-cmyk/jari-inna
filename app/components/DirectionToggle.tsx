// 방면 토글 — 호선별 동적 라벨
//
// 호선별 라벨:
//   - 4호선: 당고개행 (상행) / 오이도행 (하행)
//   - 1호선: 서울역행 (상행) / 동묘앞행 (하행)
//   - 2호선: 내선순환 (내선) / 외선순환 (외선) — 순환선이라 "행" 없음
//   - 3호선: 대화행 / 오금행
//   - 5호선: 방화행 / 하남검단산행
//   - 6호선: 응암행 / 봉화산행
//   - 7호선: 장암행 / 석남행
//   - 8호선: 별내행 / 모란행
//   - 9호선: 개화행 / 중앙보훈병원행
//
// 데이터 소스: LINES[lineCode] (단일 출처)
//   - upTerminus/downTerminus → 라벨
//   - upLabel/downLabel → 보조 안내
//
// reachable 처리:
//   - 4호선: line4Stations 의 getReachableTermini (기존)
//   - 2호선: 순환선 — 양 방향 항상 가능
//   - 그 외: 출발역이 종착역이면 그 방면만 disable

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getReachableTermini } from "../constants/line4Stations";
import { LINES, type LineKey } from "../constants/lines";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import type { Direction } from "../utils/directionCalculator";

interface Props {
  /** 출발역 — 갈 수 있는 방면 결정용 */
  fromStation: string;
  /** 출발 호선 — 라벨/종착역 결정 (LINES dict) */
  lineCode: LineKey;
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
      <Text style={[styles.label, labelStateStyle]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.hint, hintStateStyle]}>{hint}</Text>
    </Pressable>
  );
}

/**
 * 호선별 reachable 계산
 * - 4호선: 기존 line4Stations getReachableTermini
 * - 2호선: 순환선이라 양쪽 항상 가능
 * - 그 외: 출발역이 종착역과 동일하면 그 방면 disable
 */
function computeReachable(
  fromStation: string,
  lineCode: LineKey
): { up: boolean; down: boolean } {
  if (lineCode === "4") {
    const r = getReachableTermini(fromStation);
    return { up: Boolean(r.up), down: Boolean(r.down) };
  }
  if (lineCode === "2") {
    return { up: true, down: true };
  }
  const meta = LINES[lineCode];
  return {
    up: fromStation !== meta.upTerminus,
    down: fromStation !== meta.downTerminus,
  };
}

export default function DirectionToggle({
  fromStation,
  lineCode,
  selected,
  onChange,
}: Props) {
  const meta = LINES[lineCode];
  const reachable = computeReachable(fromStation, lineCode);
  const toggle = (d: Direction) => onChange(selected === d ? null : d);

  // 2호선만 순환 라벨 (행 없음), 그 외 호선은 "○○행"
  const isCircle = lineCode === "2";
  const upLabel = isCircle ? meta.upTerminus : `${meta.upTerminus}행`;
  const downLabel = isCircle ? meta.downTerminus : `${meta.downTerminus}행`;
  const upHint = isCircle ? "내선" : "상행";
  const downHint = isCircle ? "외선" : "하행";

  return (
    <View style={styles.row}>
      <Chip
        label={upLabel}
        hint={upHint}
        active={selected === "up" || selected === "inner"}
        disabled={!reachable.up}
        onPress={() => toggle(isCircle ? "inner" : "up")}
      />
      <Chip
        label={downLabel}
        hint={downHint}
        active={selected === "down" || selected === "outer"}
        disabled={!reachable.down}
        onPress={() => toggle(isCircle ? "outer" : "down")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    borderWidth: 1.5,
  },
  chipActive: {
    backgroundColor: colors.accent + "1A",
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
  label: {
    ...typography.bodyLg,
  },
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
  hint: {
    ...typography.micro,
    marginTop: 2,
  },
  hintActive: { color: colors.accent },
  hintInactive: { color: colors.textSecondary },
  hintDisabled: { color: colors.textTertiary },
});
