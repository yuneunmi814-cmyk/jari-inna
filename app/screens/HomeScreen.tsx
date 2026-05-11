// 자리있나 홈 화면 (Phase 1)
//
// 구성 (위 → 아래):
//   1) Header (로고 + 설정 + 시간대별 인사)
//   2) StationSelector (출발역)
//   3) "어디로 가세요?" 카드 (방면 토글 + 또는 + 도착역 선택)
//   4) "추천 받기" 큰 버튼 (방면 또는 도착역 중 하나 선택돼야 활성)
//   5) "다음 열차" 섹션 (출발역의 실시간 도착, 5초 폴링)
//   6) "지금 운행 중인 4호선" (30초 폴링, 가로 스크롤)
//   7) QuickActions (역 검색 / 즐겨찾기 / 환승 안내)

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArrivalCard from "../components/ArrivalCard";
import DestinationSelector from "../components/DestinationSelector";
import DirectionToggle from "../components/DirectionToggle";
import EmptyState from "../components/EmptyState";
import Header from "../components/Header";
import QuickActions from "../components/QuickActions";
import SectionHeader from "../components/SectionHeader";
import StationSelector from "../components/StationSelector";
import TrainPositionChip from "../components/TrainPositionChip";
import { useStation } from "../contexts/StationContext";
import { useArrivals } from "../hooks/useArrivals";
import { usePositions } from "../hooks/usePositions";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const {
    station,
    destination,
    direction,
    setDestination,
    setDirection,
  } = useStation();

  // 도착 정보 — 5초 폴링, pull-to-refresh
  const arrivals = useArrivals(station);

  // 4호선 운행 위치 — 30초 폴링
  const positions = usePositions(1004);

  // "추천 받기" 활성 조건: 도착역 또는 방면 중 하나 이상 선택됨
  const canRecommend = Boolean(destination || direction);

  /**
   * 추천 받기 — RecommendationScreen으로 이동
   * 출발/도착/방면은 StationContext에서 읽음 (param 안 받음)
   */
  const handleRecommend = () => {
    navigation.navigate("Recommendation");
  };

  /**
   * 도착역 picker 열기 — StationPickerScreen을 destination 모드로 재사용
   */
  const handleOpenDestinationPicker = () => {
    navigation.navigate("StationPicker", { mode: "destination" });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={arrivals.refreshing}
            onRefresh={() => {
              arrivals.refresh();
              positions.refresh();
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* 1. 헤더 */}
        <Header />

        {/* 2. 출발역 카드 */}
        <StationSelector
          station={station}
          onPress={() => navigation.navigate("StationPicker", { mode: "departure" })}
        />

        {/* 3. 어디로 가세요? 카드 */}
        <View style={styles.tripCard}>
          <Text style={styles.tripLabel}>어디로 가세요?</Text>

          {/* 방면 토글 */}
          <DirectionToggle
            fromStation={station}
            selected={direction}
            onChange={setDirection}
          />

          {/* 또는 구분선 */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는 도착역으로</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 도착역 카드 */}
          <DestinationSelector
            fromStation={station}
            destination={destination}
            onPress={handleOpenDestinationPicker}
            onClear={() => setDestination(null)}
          />
        </View>

        {/* 4. 추천 받기 버튼 */}
        <Pressable
          onPress={handleRecommend}
          disabled={!canRecommend}
          style={({ pressed }) => [
            styles.recommendBtn,
            !canRecommend && styles.recommendBtnDisabled,
            pressed && canRecommend && { opacity: 0.85 },
          ]}
          android_ripple={
            canRecommend ? { color: "#FFFFFF20", borderless: false } : undefined
          }
        >
          <Text
            style={[
              styles.recommendText,
              !canRecommend && { color: colors.textTertiary },
            ]}
          >
            {canRecommend ? "추천 받기" : "방면이나 도착역을 골라주세요"}
          </Text>
        </Pressable>

        {/* 5. 다음 열차 */}
        <SectionHeader title="다음 열차" />
        {renderArrivals(arrivals)}

        {/* 6. 지금 운행 중인 4호선 */}
        <SectionHeader title="지금 운행 중인 4호선" />
        {renderPositions(positions)}

        {/* 7. 빠른 액션 */}
        <QuickActions
          onSearchPress={() => navigation.navigate("StationPicker")}
          onFavoritesPress={() => navigation.navigate("Favorites")}
        />

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** 도착 정보 렌더링 — 로딩/에러/빈/정상 4 상태 */
function renderArrivals(arrivals: ReturnType<typeof useArrivals>) {
  if (arrivals.loading && arrivals.data.length === 0) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>잠깐, 열차 정보 가져오는 중...</Text>
      </View>
    );
  }
  if (arrivals.error && arrivals.data.length === 0) {
    return (
      <EmptyState
        emoji="😅"
        title={arrivals.error}
        description="당겨서 새로고침 해보세요"
      />
    );
  }
  if (arrivals.data.length === 0) {
    return (
      <EmptyState
        emoji="🌙"
        title="지금 도착 예정 열차가 없어요"
        description="막차 시간이거나 점검 시간일 수 있어요"
      />
    );
  }
  return (
    <View>
      {arrivals.data.slice(0, 8).map((arrival, idx) => (
        <ArrivalCard
          key={`${arrival.trainLineNm}-${arrival.recptnDt}-${idx}`}
          arrival={arrival}
        />
      ))}
    </View>
  );
}

/** 운행 중 열차 가로 스크롤 */
function renderPositions(positions: ReturnType<typeof usePositions>) {
  if (positions.loading && positions.data.length === 0) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (positions.error && positions.data.length === 0) {
    return <EmptyState emoji="😴" title={positions.error} compact />;
  }
  if (positions.data.length === 0) {
    return <EmptyState emoji="🚇" title="운행 중인 4호선 열차가 없어요" compact />;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalContent}
    >
      {positions.data.slice(0, 15).map((position) => (
        <TrainPositionChip key={position.trainNo} position={position} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  // "어디로 가세요?" 카드
  tripCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginHorizontal: spacing.md,
  },

  // 추천 받기 버튼
  recommendBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  recommendBtnDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendText: {
    ...typography.button,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  loadingBox: { alignItems: "center", paddingVertical: spacing.xl },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  horizontalContent: { paddingRight: spacing.lg },
  footerSpacer: { height: spacing.xxl },
});
