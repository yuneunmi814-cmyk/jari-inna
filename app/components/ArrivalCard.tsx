// "다음 열차" 카드 — 도착시간 + 행선지 + 현재 위치
// 좌측에 큰 시간 표시, 우측에 방면/현재 위치

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { StationArrival } from "../../shared/types/metro";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  arrival: StationArrival;
}

/**
 * 도착까지 남은 시간을 짧고 명확하게 변환
 * 우선순위: arvlCd(상태) > barvlDt(초) > arvlMsg2(서울 API 텍스트, 가공)
 *
 * 좌측 박스 폭에 들어가는 짧은 텍스트 보장:
 *   - "도착" / "곧 도착" / "N분"
 *   - "[4]번째 전역 (창동)" → "4정거장 전" (긴 원문 가공)
 */
function formatTime(arrival: StationArrival): { main: string; emphasis: boolean } {
  // 1. 명시적 상태가 가장 정확
  if (arrival.arvlCd === "1") return { main: "도착", emphasis: true };
  if (arrival.arvlCd === "0") return { main: "곧 도착", emphasis: true };

  // 2. barvlDt 초 단위
  const secs = Number(arrival.barvlDt);
  if (Number.isFinite(secs) && secs > 0) {
    const min = Math.floor(secs / 60);
    if (min === 0) return { main: `${secs}초`, emphasis: true };
    return { main: `${min}분`, emphasis: false }; // 초는 잘라서 짧게
  }

  // 3. arvlMsg2 가공
  const msg = (arrival.arvlMsg2 ?? "").trim();

  // "[4]번째 전역 (창동)" / "[N]번째 전역" → "N정거장 전"
  const m = msg.match(/^\[(\d+)\]번째 전역/);
  if (m) return { main: `${m[1]}정거장 전`, emphasis: false };

  // "전역 출발" / "전역 진입" / "전역 도착" — 그대로 (짧음)
  if (msg.startsWith("전역")) return { main: msg, emphasis: false };

  // "이번역 도착" / "○○ 도착" 같이 짧은 텍스트
  if (msg.length <= 6) return { main: msg, emphasis: false };

  // 그 외 긴 텍스트는 "-"로 단순화 (정보 손실 < 잘림 보기 흉함)
  return { main: "-", emphasis: false };
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
  // 서울 API updnLine 그대로 표시 ("상행"/"하행"/"내선"/"외선")
  const directionLabel = arrival.updnLine || "";

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
    ...shadows.card,
  },
  leftBlock: {
    width: 108, // "4정거장 전" 같은 fallback도 안 잘리게 약간 넓힘
    paddingRight: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    justifyContent: "center",
  },
  time: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 22, // 24 → 22로 살짝 줄여 안전 마진 확보
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
  // 상행/하행 뱃지 — 4호선 노선 컬러로 표시 (호선 라벨)
  directionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.line4 + "20", // 4호선 블루 12.5% alpha
  },
  directionText: {
    ...typography.micro,
    color: colors.line4,
    fontWeight: "600",
  },
  position: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
