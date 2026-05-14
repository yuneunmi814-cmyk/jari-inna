// 방면 토글 — 호선별 동적 라벨
//
// 호선별 라벨:
//   - 4호선: 당고개행 (상행) / 오이도행 (하행)
//   - 2호선: 내선순환 / 외선순환
//   - 나머지: 종착역행
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// v9 — 진짜 원인 후보 fix:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 증상: chip 배경/테두리는 inactive 로 갱신되는데 텍스트 색만 active(오렌지)로 잔존.
// 같은 컴포넌트 같은 boolean 분기에서 일부만 stale 하는 게 부자연스러움 → RN 캐시
// 버그 가정의 한계 도달.
//
// 새 가설: Android Text 노드의 **selection/highlight 잔존**
//   - TouchableOpacity onPress 직후 Android 가 자식 Text 에 시스템 accent 색
//     기반 highlight 를 적용한 채로 잔존
//   - One UI 의 시스템 accent 가 오렌지 톤이면 텍스트가 오렌지로 보임
//   - 차단: selectionColor="transparent" + suppressHighlighting={true}
//
// 보조 fix:
//   - active/inactive Text 를 conditional rendering 으로 트리 완전 분리
//     → 같은 인스턴스 재사용 0% → cache 회피
//   - fontFamily 명시 ("System") → default 폴백 차단

import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { getReachableTermini } from "../constants/line4Stations";
import { LINES, type LineKey } from "../constants/lines";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { Direction } from "../utils/directionCalculator";

interface Props {
  fromStation: string;
  lineCode: LineKey;
  selected: Direction | null;
  onChange: (d: Direction | null) => void;
}

interface ChipProps {
  label: string;
  hint: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}

// ── 색상 상수 (inline 으로 직접 박아 의존성 0) ────────────────────
const ORANGE = "#FF6600";
const BLACK = "#1A1A1A";
const GRAY = "#666666";
const GRAY_LIGHT = "#999999";
const WHITE = "#FFFFFF";
const ORANGE_BG = "#FF66001A";
const BORDER = "#D0D5DD";

function Chip({ label, hint, active, disabled, onPress }: ChipProps) {
  const isActive = !!active && !disabled;

  // chip 박스 스타일 — 매 렌더 새 객체
  const chipStyle = {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1.5,
    backgroundColor: isActive ? ORANGE_BG : WHITE,
    borderColor: isActive ? ORANGE : BORDER,
    opacity: disabled ? 0.35 : 1,
  };

  // 1회 진단 로그 — 6/1 이후 빌드 시 실기기에서 active prop 실제 값과
  // 적용된 색을 콘솔에서 확인. v9 fix 효과 없을 시 진짜 원인 데이터 확보용.
  if (__DEV__) {
    // production 빌드에선 자동 제거 (__DEV__ = false)
    // eslint-disable-next-line no-console
    console.log(`[DirectionToggle.Chip] ${label}`, {
      active,
      disabled,
      isActive,
      labelExpectedColor: disabled ? GRAY_LIGHT : isActive ? ORANGE : BLACK,
    });
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={{ flex: 1 }}
    >
      <View style={chipStyle}>
        {/*
          ✨ active / inactive 텍스트를 conditional rendering 으로 완전 분리.
             같은 Text 인스턴스 재사용 0% → React 가 다른 컴포넌트로 인식 →
             native 노드 자체가 unmount/remount → highlight/selection 잔존 불가.

          ✨ selectionColor="transparent" + suppressHighlighting → Android Text
             노드의 시스템 highlight 색 잔존 차단 (One UI 시스템 accent 가 오렌지
             톤일 경우의 가설).

          ✨ fontFamily="System" → RN default 폰트 명시 (간헐적 fallback 폰트의
             color override 차단).
        */}
        {isActive ? (
          <>
            <Text
              style={{
                fontFamily: "System",
                fontSize: 16,
                lineHeight: 24,
                fontWeight: "600",
                color: ORANGE,
              }}
              numberOfLines={1}
              allowFontScaling
              selectionColor="transparent"
              suppressHighlighting
            >
              {label}
            </Text>
            <Text
              style={{
                fontFamily: "System",
                fontSize: 11,
                lineHeight: 14,
                letterSpacing: 0.8,
                fontWeight: "500",
                marginTop: 2,
                color: ORANGE,
              }}
              allowFontScaling
              selectionColor="transparent"
              suppressHighlighting
            >
              {hint}
            </Text>
          </>
        ) : (
          <>
            <Text
              style={{
                fontFamily: "System",
                fontSize: 16,
                lineHeight: 24,
                fontWeight: "500",
                color: disabled ? GRAY_LIGHT : BLACK,
              }}
              numberOfLines={1}
              allowFontScaling
              selectionColor="transparent"
              suppressHighlighting
            >
              {label}
            </Text>
            <Text
              style={{
                fontFamily: "System",
                fontSize: 11,
                lineHeight: 14,
                letterSpacing: 0.8,
                fontWeight: "500",
                marginTop: 2,
                color: disabled ? GRAY_LIGHT : GRAY,
              }}
              allowFontScaling
              selectionColor="transparent"
              suppressHighlighting
            >
              {hint}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

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

  const isCircle = lineCode === "2";
  const upLabel = isCircle ? meta.upTerminus : `${meta.upTerminus}행`;
  const downLabel = isCircle ? meta.downTerminus : `${meta.downTerminus}행`;
  const upHint = isCircle ? "내선" : "상행";
  const downHint = isCircle ? "외선" : "하행";

  const upActive = selected === "up" || selected === "inner";
  const downActive = selected === "down" || selected === "outer";

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
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
