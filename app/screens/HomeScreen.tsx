// 시티드 홈 화면 (Phase 1)
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
import React, { useState } from "react";
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
import AddFavoriteModal from "../components/AddFavoriteModal";
import ArrivalCard from "../components/ArrivalCard";
import DestinationSelector from "../components/DestinationSelector";
import DirectionToggle from "../components/DirectionToggle";
import EmptyState from "../components/EmptyState";
import Header from "../components/Header";
import QuickActions from "../components/QuickActions";
import QuickStartSection from "../components/QuickStartSection";
import SectionHeader from "../components/SectionHeader";
import StationSelector from "../components/StationSelector";
import SwapButton from "../components/SwapButton";
import TrainPositionChip from "../components/TrainPositionChip";
import { useRouteFavorites } from "../contexts/RouteFavoritesContext";
import { useStation } from "../contexts/StationContext";
import { useArrivals } from "../hooks/useArrivals";
import { usePositions } from "../hooks/usePositions";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const {
    station,
    departureLine,
    destination,
    destinationLine,
    direction,
    setDestination,
    setDirection,
    swapStations,
    setTrip,
  } = useStation();
  const { routes: favRoutes, addRoute, hasRoute } = useRouteFavorites();

  // 즐겨찾기 추가 모달 표시 여부 — 출발/도착 둘 다 있을 때만 활성
  const [favModalVisible, setFavModalVisible] = useState(false);
  const canFavorite = Boolean(destination);
  const alreadyFavorited = canFavorite ? hasRoute(station, destination!) : false;

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

        {/* 1.5 ⚡ 빠른 출발 — 즐겨찾기 1탭 사용 (호선 lineCode 함께 복원) */}
        <QuickStartSection
          routes={favRoutes}
          onUseRoute={(r) =>
            setTrip(
              r.departure,
              r.destination,
              (r.departureLine as any) ?? "4",
              (r.destinationLine as any) ?? "4"
            )
          }
          onAddNew={() => navigation.navigate("Favorites")}
        />

        {/* 2. 출발역 카드 — dot 컬러를 departureLine 기준으로 표시 */}
        {/*    (안 넘기면 StationSelector 가 ["4"] 하드코딩 fallback) */}
        <StationSelector
          station={station}
          lines={[departureLine]}
          onPress={() => navigation.navigate("StationPicker", { mode: "departure" })}
        />

        {/* 2.5 출발 ↔ 도착 swap 버튼 row — 도착역 있을 때만 활성 */}
        <View style={styles.swapRow}>
          <SwapButton disabled={!destination} onPress={swapStations} />
        </View>

        {/* 3. 어디로 가세요? 카드 */}
        <View style={styles.tripCard}>
          <Text style={styles.tripLabel}>어디로 가세요?</Text>

          {/* 방면 토글 — 호선별 동적 라벨 (당고개행/오이도행은 4호선만) */}
          <DirectionToggle
            fromStation={station}
            lineCode={departureLine}
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
            fromLineCode={departureLine}
            destination={destination}
            onPress={handleOpenDestinationPicker}
            onClear={() => setDestination(null)}
          />
        </View>

        {/* 4. 액션 버튼 row — 추천 받기 (메인) + ⭐ 즐겨찾기 추가 (보조) */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleRecommend}
            disabled={!canRecommend}
            style={({ pressed }) => [
              styles.recommendBtn,
              !canRecommend && styles.recommendBtnDisabled,
              pressed && canRecommend && { opacity: 0.85 },
            ]}
            android_ripple={
              canRecommend ? { color: colors.ripplePrimary, borderless: false } : undefined
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

          {/* 즐겨찾기 추가 — 도착역 있을 때만 활성, 이미 추가됨이면 표시만 */}
          <Pressable
            onPress={() => setFavModalVisible(true)}
            disabled={!canFavorite || alreadyFavorited}
            style={({ pressed }) => [
              styles.favBtn,
              (!canFavorite || alreadyFavorited) && styles.favBtnDisabled,
              pressed && canFavorite && !alreadyFavorited && { opacity: 0.7 },
            ]}
            accessibilityLabel={
              alreadyFavorited
                ? "이미 즐겨찾기에 있음"
                : "이 경로 즐겨찾기에 추가"
            }
          >
            <Text style={styles.favBtnIcon}>{alreadyFavorited ? "✓" : "⭐"}</Text>
          </Pressable>
        </View>

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

      {/* 경로 즐겨찾기 추가 모달 — 출발/도착 + 호선 prefill */}
      <AddFavoriteModal
        visible={favModalVisible}
        departure={station}
        destination={destination ?? ""}
        onCancel={() => setFavModalVisible(false)}
        onSubmit={async (input) => {
          // 현재 Context의 호선코드를 함께 저장 (마이그레이션 호환)
          await addRoute({
            ...input,
            departureLine,
            destinationLine: destinationLine ?? "4",
          });
          setFavModalVisible(false);
        }}
      />
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

  // swap 버튼 row — 출발역 카드와 "어디로 가세요?" 카드 사이 가운데
  swapRow: {
    alignItems: "center",
    marginTop: spacing.sm,
  },

  // "어디로 가세요?" 카드
  tripCard: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
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

  // 액션 row (추천 받기 + 즐겨찾기)
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  // 추천 받기 — 메인 (flex 1)
  recommendBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
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
  // 즐겨찾기 추가 — 보조 정사각 버튼
  favBtn: {
    width: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  favBtnDisabled: {
    borderColor: colors.border,
    opacity: 0.5,
  },
  favBtnIcon: {
    fontSize: 22,
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
