// 환승역 호선 선택 모달
//
// 사용 흐름:
//   1) 사용자가 환승역(예: 사당) 탭
//   2) 이 모달 자동 오픈
//   3) 통과하는 호선들을 카드로 보여줌 (호선 컬러 큰 동그라미)
//   4) 사용자 탭 → onSelect(lineKey) → 모달 닫힘
//
// 디자인:
//   - 라이트 모드, 흰 sheet
//   - 호선 카드 그리드 (2열, 호선 수 만큼 줄)
//   - 카드: 호선 컬러 큰 동그라미 안 호선 번호 + 호선 이름 + "{up} ↔ {down}" 종착역
//   - 누름 시 시안/오렌지 보더 강조 (애니메이션 안 함, 즉시 닫힘)

import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { LINES, type LineKey } from "../constants/lines";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  visible: boolean;
  /** 환승역 이름 (헤더 표시용) */
  stationName: string;
  /** 통과하는 호선들 (보통 TRANSFER_STATIONS[stationName]) */
  lines: LineKey[];
  /** 호선 선택 시 호출 */
  onSelect: (lineCode: LineKey) => void;
  /** 외부 탭 / 취소 */
  onCancel: () => void;
}

export default function LineSelectModal({
  visible,
  stationName,
  lines,
  onSelect,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          {/* 시트 내부 탭은 닫힘 방지 */}
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.sheet}>
              <Text style={styles.title}>🚇 {stationName}은(는) 환승역이에요</Text>
              <Text style={styles.subtitle}>
                어느 호선으로 이동하실 예정이세요?
              </Text>

              <View style={styles.grid}>
                {lines.map((ln) => (
                  <LineCard
                    key={ln}
                    lineKey={ln}
                    onPress={() => onSelect(ln)}
                  />
                ))}
              </View>

              <Pressable
                onPress={onCancel}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.cancelText}>나중에 고를래요</Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/** 호선 카드 — 큰 동그라미 + 호선명 + 종착역 */
function LineCard({
  lineKey,
  onPress,
}: {
  lineKey: LineKey;
  onPress: () => void;
}) {
  const meta = LINES[lineKey];
  const color = colors[meta.colorKey];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 },
      ]}
      android_ripple={{ color: colors.rippleOnSurface, borderless: false }}
      accessibilityLabel={`${meta.name} 선택`}
      accessibilityRole="button"
    >
      <View style={[styles.circle, { backgroundColor: color }]}>
        <Text style={styles.circleNum}>{lineKey}</Text>
      </View>
      <Text style={styles.lineName}>{meta.name}</Text>
      <Text style={styles.terminus} numberOfLines={1}>
        {meta.upTerminus} ↔ {meta.downTerminus}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.h2,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  // 2열 그리드 (flex-wrap, 호선 카드 4~6개 가정)
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  // 카드 — 2열에 균등 분배 (대략 가로 50% - gap)
  card: {
    width: "48%",
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },

  // 호선 번호가 들어가는 큰 컬러 동그라미
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  circleNum: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
  },

  lineName: {
    ...typography.bodyLg,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  terminus: {
    ...typography.micro,
    color: colors.textSecondary,
    textAlign: "center",
  },

  // 취소 버튼
  cancelBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
