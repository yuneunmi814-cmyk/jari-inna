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
// ⚠️ v1.0 stale 시각 상태 fix 시도 이력:
//   v6: inline 스타일 — 실패
//   v7: View 래핑 + key remount + 완전 inline — 실패
//   v8: Pressable → TouchableOpacity 전면 교체 (이 파일)
//
// v8 가설:
// RN Pressable 의 newArchEnabled 환경 렌더링 글리치가 원인일 가능성.
// TouchableOpacity 는 다른 native impl (RCTTouchableOpacity) 를 사용하므로
// Pressable 특유의 children 처리 버그를 피할 수 있을지 검증.
//
// 손실:
//   - android_ripple 효과 사라짐 (TouchableOpacity 는 미지원)
//   → activeOpacity 로 시각 피드백 대체

import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
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
  const isActive = !!active && !disabled;

  const chipStyle = {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1.5,
    backgroundColor: isActive ? colors.accent + "1A" : colors.surface,
    borderColor: isActive ? colors.accent : colors.border,
    opacity: disabled ? 0.35 : 1,
  };

  const labelStyle = {
    fontSize: typography.bodyLg.fontSize,
    lineHeight: typography.bodyLg.lineHeight,
    color: disabled
      ? colors.textTertiary
      : isActive
      ? colors.accent
      : colors.textPrimary,
    fontWeight: (isActive ? "600" : "500") as "500" | "600",
  };

  const hintStyle = {
    fontSize: typography.micro.fontSize,
    lineHeight: typography.micro.lineHeight,
    letterSpacing: typography.micro.letterSpacing,
    marginTop: 2,
    fontWeight: "500" as const,
    color: disabled
      ? colors.textTertiary
      : isActive
      ? colors.accent
      : colors.textSecondary,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={{ flex: 1 }}
    >
      <View style={chipStyle}>
        <Text style={labelStyle} numberOfLines={1}>
          {label}
        </Text>
        <Text style={hintStyle}>{hint}</Text>
      </View>
    </TouchableOpacity>
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

  const upActive = selected === "up" || selected === "inner";
  const downActive = selected === "down" || selected === "outer";

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {/* key 에 active/disabled/lineCode 인코딩 → 상태 변할 때 강제 unmount/remount */}
      <Chip
        key={`up-${lineCode}-${upActive}-${!reachable.up}`}
        label={upLabel}
        hint={upHint}
        active={upActive}
        disabled={!reachable.up}
        onPress={() => toggle(isCircle ? "inner" : "up")}
      />
      <Chip
        key={`down-${lineCode}-${downActive}-${!reachable.down}`}
        label={downLabel}
        hint={downHint}
        active={downActive}
        disabled={!reachable.down}
        onPress={() => toggle(isCircle ? "outer" : "down")}
      />
    </View>
  );
}
