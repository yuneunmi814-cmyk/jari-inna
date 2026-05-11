// "지금 운행 중인 4호선" 가로 스크롤 칩
// 컴팩트하게 열차 번호 + 현재역 + 행선지 표시

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { TrainPosition } from "../../shared/types/metro";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  position: TrainPosition;
}

/**
 * 열차 상태 코드 → 한글
 * 0: 진입, 1: 도착, 2: 출발, 3: 전역출발, 4: 전역진입, 5: 전역도착, 99: 운행중
 */
function statusLabel(code: string): string {
  switch (code) {
    case "0": return "진입";
    case "1": return "도착";
    case "2": return "출발";
    case "3": return "이전역 출발";
    case "4": return "이전역 진입";
    case "5": return "이전역 도착";
    default: return "운행중";
  }
}

export default function TrainPositionChip({ position }: Props) {
  return (
    <View style={styles.chip}>
      <View style={styles.headerRow}>
        <Text style={styles.trainNo}>{position.trainNo}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{statusLabel(position.trainSttus)}</Text>
        </View>
      </View>
      <Text style={styles.station} numberOfLines={1}>
        {position.statnNm}
      </Text>
      <Text style={styles.direction} numberOfLines={1}>
        → {position.statnTnm}행
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  trainNo: {
    ...typography.micro,
    color: colors.textSecondary,
    fontFamily: "monospace", // 안드로이드 Roboto Mono fallback
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.accent + "20",
  },
  statusText: {
    ...typography.micro,
    color: colors.accent,
  },
  station: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  direction: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
