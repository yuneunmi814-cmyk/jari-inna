// 추천 결과 화면 (Phase 1)
//
// 구성:
//   1) 헤더: ← 뒤로 + "○○역 → ○○역 (방면)"
//   2) 추천 탑승 칸 카드 (Phase 1 더미 데이터)
//   3) 경로 요약 (도착역 있을 때): N정거장 · 약 M분
//   4) 다음 열차 — 선택한 방면만 필터링 (서울 API)
//   5) 환승 안내 (도착역이 환승역이면 더미 — Phase 2 예정)
//   6) 하단: "이 경로 즐겨찾기 추가"
//
// 데이터 소스:
//   - 출발역/도착역/방면: StationContext
//   - 도착 정보(실시간): 서울 열린데이터광장 (useArrivals)
//   - 추천 칸: utils/seatRecommender (더미). Phase 2 후 레일포털 데이터로 교체.

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArrivalCard from "../components/ArrivalCard";
import EmptyState from "../components/EmptyState";
import SectionHeader from "../components/SectionHeader";
import { getStationByName } from "../constants/line4Stations";
import { useFavorites } from "../contexts/FavoritesContext";
import { useStation } from "../contexts/StationContext";
import { useArrivals } from "../hooks/useArrivals";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import {
  calculateDirection,
  countStops,
  estimateTravelMinutes,
  getDirectionFromTerminus,
  type DirectionResult,
} from "../utils/directionCalculator";
import {
  congestionColorKey,
  recommendSeat,
} from "../utils/seatRecommender";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Recommendation">;

export default function RecommendationScreen() {
  const navigation = useNavigation<NavProp>();
  const { station, destination, direction, resetTrip } = useStation();
  const { addFavorite, isFavorite } = useFavorites();

  // 추천 칸 새로고침 카운터 — 사용자가 ↻ 누를 때마다 증가 → 다른 칸/혼잡도 추천
  const [seatNonce, setSeatNonce] = useState(0);

  // 방면 정보 결정: 도착역 있으면 우선, 없으면 사용자가 고른 방면
  const dirResult: DirectionResult | null = useMemo(() => {
    if (destination) return calculateDirection(station, destination);
    if (direction) {
      const terminus = direction === "up" ? "당고개" : "오이도";
      return getDirectionFromTerminus(station, terminus);
    }
    return null;
  }, [station, destination, direction]);

  // 헤더 타이틀 — 도착역 유무에 따라
  const headerTitle = destination
    ? `${station} → ${destination}`
    : `${station}${dirResult ? `, ${dirResult.directionText}` : ""}`;

  // 추천 칸 — 출발역 + 시간 + nonce 기반 더미
  // nonce 변경 시(새로고침 버튼) 다른 결과 도출
  const recommendation = useMemo(
    () => recommendSeat(station, new Date().getHours(), seatNonce),
    [station, seatNonce]
  );

  /** 새로 추천받기 — 시각적 피드백 위해 nonce 증가 */
  const handleRerollSeat = () => setSeatNonce((n) => n + 1);

  /** 다시 고를래요 — 도착역/방면 모두 초기화 + 홈으로 돌아가기 */
  const handleResetTrip = () => {
    resetTrip();
    navigation.goBack();
  };

  // 도착 정보 — 5초 폴링
  const arrivals = useArrivals(station);

  // 방면 필터링 — 서울 API의 updnLine 사용 (이미 "상행"/"하행" 한글로 옴)
  const filteredArrivals = useMemo(() => {
    if (!dirResult) return arrivals.data;
    const targetUpdn = dirResult.direction === "up" ? "상행" : "하행";
    return arrivals.data.filter((a) => a.updnLine === targetUpdn);
  }, [arrivals.data, dirResult]);

  // 도착역 환승역 여부
  const destInfo = destination ? getStationByName(destination) : undefined;
  const isDestinationTransfer = Boolean(destInfo?.isTransfer);

  // 정거장 수 / 소요 시간
  const stops = destination ? countStops(station, destination) : 0;
  const travelMin = destination ? estimateTravelMinutes(station, destination) : 0;

  // 즐겨찾기 추가 — Phase 1은 도착역 단순 즐겨찾기로 처리 (Phase 2에서 경로 즐겨찾기로 확장)
  const alreadyFav = destination ? isFavorite(destination) : false;
  const handleAddFav = () => {
    if (!destination) {
      Alert.alert("도착역이 없어요", "도착역을 골랐을 때 경로 즐겨찾기가 가능해요");
      return;
    }
    if (alreadyFav) {
      Alert.alert("이미 추가됨", `'${destination}'은(는) 이미 즐겨찾기에 있어요`);
      return;
    }
    addFavorite(destination, `${station} 출발`);
    Alert.alert("추가됨", `'${destination}'을(를) 즐겨찾기에 추가했어요`);
  };

  const congKey = congestionColorKey(recommendation.congestion);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* 헤더 — 좌측 "다시 고를래요"는 resetTrip + 홈으로 */}
      <View style={styles.header}>
        <Pressable
          onPress={handleResetTrip}
          hitSlop={8}
          style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.resetText}>← 다시 고를래요</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          {dirResult && (
            <Text style={styles.headerSub}>{dirResult.label}</Text>
          )}
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. 추천 탑승 칸 카드 */}
        <View style={styles.recoCard}>
          <View style={styles.recoHeader}>
            <Text style={styles.recoLabel}>추천 탑승 칸</Text>
            <Pressable
              onPress={handleRerollSeat}
              hitSlop={10}
              style={({ pressed }) => [styles.rerollBtn, pressed && { opacity: 0.5 }]}
            >
              <Text style={styles.rerollIcon}>↻</Text>
              <Text style={styles.rerollText}>다시 추천</Text>
            </Pressable>
          </View>
          <View style={styles.recoMain}>
            <Text style={styles.carEmoji}>🚇</Text>
            <View style={styles.recoTextBlock}>
              <Text style={styles.carNumber}>
                {recommendation.carNo}호차
              </Text>
              <View style={styles.congestionRow}>
                <View
                  style={[
                    styles.congestionDot,
                    { backgroundColor: colors[congKey] },
                  ]}
                />
                <Text
                  style={[styles.congestionLabel, { color: colors[congKey] }]}
                >
                  {recommendation.congestionLabel}
                </Text>
              </View>
              <Text style={styles.recoTip}>💡 {recommendation.tip}</Text>
            </View>
          </View>
          <View style={styles.disclosure}>
            <Text style={styles.disclosureText}>
              Phase 2에 진짜 혼잡도 데이터가 들어와요
            </Text>
          </View>
        </View>

        {/* 2. 경로 요약 (도착역 있을 때만) */}
        {destination && (
          <View style={styles.tripSummary}>
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>{stops}</Text>
              <Text style={styles.tripStatLabel}>정거장</Text>
            </View>
            <View style={styles.tripDivider} />
            <View style={styles.tripStat}>
              <Text style={styles.tripStatValue}>약 {travelMin}</Text>
              <Text style={styles.tripStatLabel}>분</Text>
            </View>
            {isDestinationTransfer && (
              <>
                <View style={styles.tripDivider} />
                <View style={styles.tripStat}>
                  <Text style={styles.tripStatBadge}>환승역</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* 3. 다음 열차 — 방면 필터링 */}
        <SectionHeader
          title={dirResult ? `다음 ${dirResult.label} 열차` : "다음 열차"}
        />
        {renderArrivals(arrivals, filteredArrivals)}

        {/* 4. 환승 안내 (Phase 2 예정) */}
        {isDestinationTransfer && (
          <View style={styles.transferCard}>
            <Text style={styles.transferIcon}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.transferTitle}>
                {destination}은(는) 환승역이에요
              </Text>
              <Text style={styles.transferDesc}>
                도착하면 다른 노선으로 갈아탈 수 있어요.{"\n"}
                자세한 환승 안내는 Phase 2에서 만나요!
              </Text>
            </View>
          </View>
        )}

        {/* 5. 즐겨찾기 추가 */}
        <Pressable
          onPress={handleAddFav}
          style={({ pressed }) => [
            styles.favBtn,
            pressed && { opacity: 0.8 },
            alreadyFav && styles.favBtnDone,
          ]}
          android_ripple={{ color: "#FFFFFF20", borderless: false }}
        >
          <Text style={styles.favIcon}>{alreadyFav ? "✓" : "⭐"}</Text>
          <Text style={styles.favText}>
            {alreadyFav
              ? "이미 즐겨찾기에 있어요"
              : destination
              ? "이 경로 즐겨찾기에 추가"
              : "도착역을 골라야 추가할 수 있어요"}
          </Text>
        </Pressable>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** 도착 정보 렌더링 — 로딩/에러/빈/정상 */
function renderArrivals(
  arrivals: ReturnType<typeof useArrivals>,
  filtered: typeof arrivals.data
) {
  if (arrivals.loading && arrivals.data.length === 0) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>잠깐, 열차 정보 가져오는 중...</Text>
      </View>
    );
  }
  if (arrivals.error && arrivals.data.length === 0) {
    return <EmptyState emoji="😅" title={arrivals.error} />;
  }
  if (filtered.length === 0) {
    return (
      <EmptyState
        emoji="🌙"
        title="이 방면 다음 열차가 없어요"
        description="잠시 후 다시 확인해보세요"
      />
    );
  }
  return (
    <View>
      {filtered.slice(0, 6).map((arrival, idx) => (
        <ArrivalCard
          key={`${arrival.trainLineNm}-${arrival.recptnDt}-${idx}`}
          arrival={arrival}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  resetBtn: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  resetText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerRightSpacer: { width: 88 }, // resetBtn 텍스트 폭과 비슷하게 — 중앙 타이틀 균형
  headerTitle: { ...typography.h3, color: colors.textPrimary, fontSize: 18 },
  headerSub: { ...typography.caption, color: colors.accent, marginTop: 2 },

  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // 추천 칸 카드
  recoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  recoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rerollBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  rerollIcon: { fontSize: 14, color: colors.accent, fontWeight: "700" },
  rerollText: { ...typography.micro, color: colors.accent, fontWeight: "600" },
  recoMain: { flexDirection: "row", alignItems: "center" },
  carEmoji: { fontSize: 56, marginRight: spacing.lg },
  recoTextBlock: { flex: 1 },
  carNumber: {
    ...typography.display,
    color: colors.textPrimary,
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  congestionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  congestionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  congestionLabel: { ...typography.bodyLg, fontWeight: "600" },
  recoTip: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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

  // 경로 요약
  tripSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripStat: { flex: 1, alignItems: "center" },
  tripStatValue: {
    ...typography.h2,
    color: colors.accent,
  },
  tripStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tripStatBadge: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primary + "30",
  },
  tripDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // 환승 카드
  transferCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  transferIcon: { fontSize: 24, marginTop: 2 },
  transferTitle: {
    ...typography.bodyLg,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  transferDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // 즐겨찾기 버튼
  favBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  favBtnDone: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  favIcon: { fontSize: 18, color: colors.textPrimary },
  favText: { ...typography.button, color: colors.textPrimary, fontWeight: "700" },

  loadingBox: { alignItems: "center", paddingVertical: spacing.xl },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  footerSpacer: { height: spacing.xxl },
});
