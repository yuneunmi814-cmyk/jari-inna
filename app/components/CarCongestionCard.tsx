// 칸별 혼잡도 카드 — PUZZLE (SK Open API) 데이터 기반
//
// UI 구성:
//   - 시간대 라벨 ("퇴근시간 19:00")
//   - 사용자 방면의 10칸 가로 바 (혼잡도 % 색상)
//   - 추천 칸 번호 + 한 줄 메시지
//   - 반대 방면은 작게 (참고)
//   - Disclosure: "PUZZLE 분당 평균 데이터예요"

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  CarCongestionData,
  DirectionCongestion,
} from "../api/carCongestion";
import { carCongestionLabel, carCongestionLevel } from "../api/carCongestion";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  data: CarCongestionData;
  /** 사용자가 갈 방면 (0=외선/하행, 1=내선/상행). 없으면 추천 방면 우선 */
  selectedDirection?: 0 | 1 | null;
}

function levelColor(pct: number): string {
  const lv = carCongestionLevel(pct);
  if (lv === "very_low") return colors.success;
  if (lv === "low") return colors.success;
  if (lv === "medium") return colors.warning;
  return colors.danger;
}

/** 가로 바 1개 — 칸 번호 + 혼잡도 색상 */
function CarBar({
  carNo,
  pct,
  isBest,
}: {
  carNo: number;
  pct: number;
  isBest: boolean;
}) {
  return (
    <View style={styles.barCol}>
      <View
        style={[
          styles.bar,
          { backgroundColor: levelColor(pct) },
          isBest && styles.barBest,
        ]}
      />
      <Text style={[styles.carNo, isBest && styles.carNoBest]}>{carNo}</Text>
    </View>
  );
}

function DirectionBlock({
  dir,
  emphasis,
}: {
  dir: DirectionCongestion;
  emphasis: boolean;
}) {
  return (
    <View style={[styles.dirBlock, emphasis && styles.dirBlockBig]}>
      <View style={styles.dirHeader}>
        <Text style={[styles.dirLabel, emphasis && styles.dirLabelBig]}>
          {dir.directionLabel}
        </Text>
        <Text style={styles.dirAvg}>
          평균 <Text style={{ color: levelColor(dir.avgCongestion) }}>
            {carCongestionLabel(dir.avgCongestion)} · {dir.avgCongestion}%
          </Text>
        </Text>
      </View>
      <View style={styles.barRow}>
        {dir.cars.map((pct, idx) => (
          <CarBar
            key={idx}
            carNo={idx + 1}
            pct={pct}
            isBest={emphasis && idx + 1 === dir.bestCarNo}
          />
        ))}
      </View>
      {emphasis && (
        <Text style={styles.bestHint}>
          💡 {dir.bestCarNo}번 칸이 가장 한산해요 ({dir.bestCongestion}%)
        </Text>
      )}
    </View>
  );
}

export default function CarCongestionCard({ data, selectedDirection }: Props) {
  // 사용자 방면 우선, 없으면 추천 방면 강조
  const primaryDir = selectedDirection ?? data.recommended?.direction ?? 0;
  const dirs = data.directions;
  const primary = dirs.find((d) => d.updnLine === primaryDir);
  const other = dirs.find((d) => d.updnLine !== primaryDir);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.timeLabel}>
          {data.hourLabel} ({data.time}) 칸별 혼잡도
        </Text>
      </View>

      {primary && <DirectionBlock dir={primary} emphasis />}
      {other && <DirectionBlock dir={other} emphasis={false} />}

      <View style={styles.disclosure}>
        <Text style={styles.disclosureText}>
          PUZZLE (SK Open API) 시간대별 평균
        </Text>
      </View>
    </View>
  );
}

const BAR_HEIGHT = 32;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    marginBottom: spacing.md,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dirBlock: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  dirBlockBig: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  dirHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: spacing.sm,
  },
  dirLabel: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  dirLabelBig: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: "700",
  },
  dirAvg: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  barRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 3,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
  },
  bar: {
    width: "100%",
    height: BAR_HEIGHT,
    borderRadius: 4,
  },
  barBest: {
    borderWidth: 2,
    borderColor: colors.primary,
    height: BAR_HEIGHT + 4,
    marginTop: -2,
  },
  carNo: {
    ...typography.micro,
    color: colors.textTertiary,
    marginTop: 4,
    fontWeight: "600",
  },
  carNoBest: {
    color: colors.primary,
    fontWeight: "700",
  },
  bestHint: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
    marginTop: spacing.sm,
  },
  disclosure: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  disclosureText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: "center",
  },
});
