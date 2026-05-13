// GPS 기반 가까운 역 섹션 — StationPicker 상단에 표시
//
// 상태별 UI:
//   - loading: 작은 spinner + "내 위치 찾는 중..."
//   - granted: 가까운 역 3개 list + 거리 표시 + 재조회 버튼
//   - denied: 안내 + "권한 허용" 버튼 (OS 설정 페이지)
//   - error / out_of_range: 안내 + "재시도" 버튼

import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { formatDistance, type NearestStationResult } from "../utils/geoDistance";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import type { GpsStatus } from "../hooks/useNearestStation";

interface Props {
  status: GpsStatus;
  nearestList: NearestStationResult[];
  onSelectStation: (name: string) => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export default function NearbyStationsSection({
  status,
  nearestList,
  onSelectStation,
  onRefresh,
  onOpenSettings,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 내 위치 근처 역</Text>
        {status === "granted" && (
          <Pressable
            onPress={onRefresh}
            hitSlop={8}
            style={({ pressed }) => [styles.refresh, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.refreshText}>↻ 재검색</Text>
          </Pressable>
        )}
      </View>

      {status === "loading" && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.muted}>내 위치 찾는 중...</Text>
        </View>
      )}

      {status === "denied" && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            위치 권한이 필요해요. 자동으로 가까운 역 잡아드릴게요
          </Text>
          <Pressable
            onPress={onOpenSettings}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.btnText}>권한 허용</Text>
          </Pressable>
        </View>
      )}

      {(status === "error" || status === "out_of_range") && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {status === "out_of_range"
              ? "근처에 지하철역이 없어요"
              : "위치를 못 잡았어요. 지하/실내일 수 있어요"}
          </Text>
          <Pressable
            onPress={onRefresh}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.btnText}>재시도</Text>
          </Pressable>
        </View>
      )}

      {status === "granted" && nearestList.length > 0 && (
        <View style={styles.list}>
          {nearestList.slice(0, 3).map((item) => (
            <Pressable
              key={item.station.name}
              onPress={() => onSelectStation(item.station.name)}
              style={({ pressed }) => [
                styles.item,
                pressed && { backgroundColor: colors.surfaceElevated },
              ]}
              android_ripple={{ color: colors.surfaceElevated, borderless: false }}
            >
              <Text style={styles.itemName}>{item.station.name}</Text>
              <Text style={styles.itemDistance}>
                {formatDistance(item.distanceM)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  refresh: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  refreshText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  muted: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  notice: {
    paddingVertical: spacing.sm,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  btn: {
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  btnText: {
    ...typography.caption,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  list: {
    gap: spacing.xs,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  itemName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  itemDistance: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
});
