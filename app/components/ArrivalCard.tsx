// "다음 열차" 카드 — 도착시간 + 행선지 + 현재 위치
// 좌측에 큰 시간 표시, 우측에 방면/현재 위치

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { StationArrival } from "../../shared/types/metro";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  arrival: StationArrival;
}

/**
 * 도착까지 남은 시간을 사람이 읽기 좋게 변환
 * 우선순위: arvlCd(상태) > barvlDt(초)
 */
function formatTime(arrival: StationArrival): { main: string; emphasis: boolean } {
  // arvlCd가 1(도착) / 0(진입)이면 메시지 우선
  if (arrival.arvlCd === "1") return { main: "도착", emphasis: true };
  if (arrival.arvlCd === "0") return { main: "곧 도착", emphasis: true };

  // barvlDt가 숫자 초 단위로 들어오는 경우
  const secs = Number(arrival.barvlDt);
  if (Number.isFinite(secs) && secs > 0) {
    const min = Math.floor(secs / 60);
    const remain = secs % 60;
    if (min === 0) return { main: `${remain}초`, emphasis: true };
    if (remain === 0) return { main: `${min}분`, emphasis: false };
    return { main: `${min}분 ${remain}초`, emphasis: false };
  }

  // fallback: 서울 API arvlMsg2 그대로 (예: "[2]번째 전역 (선바위)")
  return { main: arrival.arvlMsg2 || "-", emphasis: false };
}

/**
 * trainLineNm에서 행선지만 추출
 * "불암산행 - 총신대입구(이수)방면" → "불암산행"
 */
function getDestination(trainLineNm: string): string {
  if (!trainLineNm) return "";
  const idx = trainLineNm.indexOf("행");
  if (idx > 0) return trainLineNm.slice(0, idx + 1);
  return trainLineNm;
}

export default function ArrivalCard({ arrival }: Props) {
  const time = formatTime(arrival);
  const destination = getDestination(arrival.trainLineNm);
  const directionLabel = arrival.updnLine === "상행" ? "상행" : "하행";

  return (
    <View style={styles.card}>
      {/* 좌측: 큰 시간 */}
      <View style={styles.leftBlock}>
        <Text
          style={[
            styles.time,
            time.emphasis && { color: colors.accent },
          ]}
          numberOfLines={1}
        >
          {time.main}
        </Text>
      </View>

      {/* 우측: 행선지 + 현재 위치 */}
      <View style={styles.rightBlock}>
        <View style={styles.destinationRow}>
          <Text style={styles.destination} numberOfLines={1}>
            {destination}
          </Text>
          <View style={styles.directionBadge}>
            <Text style={styles.directionText}>{directionLabel}</Text>
          </View>
        </View>
        <Text style={styles.position} numberOfLines={1}>
          {arrival.arvlMsg3 || arrival.arvlMsg2 || ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  leftBlock: {
    width: 96,
    paddingRight: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  time: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 24,
  },
  rightBlock: {
    flex: 1,
    paddingLeft: spacing.md,
    justifyContent: "center",
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  destination: {
    ...typography.bodyLg,
    color: colors.textPrimary,
    fontWeight: "600",
    marginRight: spacing.sm,
    flexShrink: 1,
  },
  directionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.primary + "30", // 20% 투명도
  },
  directionText: {
    ...typography.micro,
    color: colors.accent,
  },
  position: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
