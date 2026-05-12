// 호선 컬러 뱃지/점
//
// variant 2종:
//   - "badge": 둥근 사각형 안 호선 번호 (예: 역 리스트 우측, 18×18 흰 글씨)
//   - "dot":   작은 원형 컬러 점 (예: 출발역 카드 옆 시각 강조용)
//
// 단일 호선이든 환승역(다중)이든 동일 컴포넌트.
// 호선 컬러는 LINES[key].colorKey → theme/colors 의 단일 출처.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LINES, type LineKey } from "../constants/lines";
import { colors } from "../theme/colors";

interface Props {
  lines: LineKey[];
  variant?: "badge" | "dot";
}

/** 호선 키 → 컬러 hex (LINES dict 단일 출처) */
function lineColor(key: LineKey): string {
  return colors[LINES[key].colorKey];
}

export default function LineBadges({ lines, variant = "badge" }: Props) {
  if (!lines || lines.length === 0) return null;

  if (variant === "dot") {
    return (
      <View style={styles.row}>
        {lines.map((ln) => (
          <View
            key={ln}
            style={[styles.dot, { backgroundColor: lineColor(ln) }]}
            accessibilityLabel={`${LINES[ln].name}`}
          />
        ))}
      </View>
    );
  }

  // badge
  return (
    <View style={styles.row}>
      {lines.map((ln) => (
        <View
          key={ln}
          style={[styles.badge, { backgroundColor: lineColor(ln) }]}
          accessibilityLabel={`${LINES[ln].name}`}
        >
          <Text style={styles.badgeText}>{ln}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  // 18×18 둥근 사각, 호선 번호 흰글씨
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
  },

  // 작은 원형 점 (8×8)
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
});
