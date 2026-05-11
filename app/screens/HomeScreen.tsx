// 자리있나 홈 화면 (Phase 2)
// 구성:
//   1) Header (로고 + 설정 + 시간대별 인사)
//   2) StationSelector (출발역 선택)
//   3) "다음 열차" 섹션 (5초 폴링, pull-to-refresh)
//   4) "지금 운행 중인 4호선" 섹션 (30초 폴링, 가로 스크롤)
//   5) QuickActions (역 검색 / 즐겨찾기 / 환승 안내)

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArrivalCard from "../components/ArrivalCard";
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
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { station } = useStation();

  // 도착 정보 — 5초 폴링, pull-to-refresh
  const arrivals = useArrivals(station);

  // 4호선 운행 위치 — 30초 폴링
  const positions = usePositions(1004);

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
            tintColor={colors.accent}        // iOS 스피너 색
            colors={[colors.accent]}         // 안드로이드 스피너 색
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* 1. 헤더 */}
        <Header />

        {/* 2. 출발역 선택 카드 */}
        <StationSelector
          station={station}
          onPress={() => navigation.navigate("StationPicker")}
        />

        {/* 3. 다음 열차 */}
        <SectionHeader title="다음 열차" />
        {renderArrivals(arrivals)}

        {/* 4. 지금 운행 중인 4호선 */}
        <SectionHeader
          title="지금 운행 중인 4호선"
          actionLabel="전체보기 →"
          onAction={() => navigation.navigate("StationPicker")}
        />
        {renderPositions(positions)}

        {/* 5. 빠른 액션 */}
        <QuickActions
          onSearchPress={() => navigation.navigate("StationPicker")}
          onFavoritesPress={() => navigation.navigate("Favorites")}
        />

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 도착 정보 섹션 렌더링
 * 로딩/에러/빈 상태/정상 4가지 분기
 */
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
        <ArrivalCard key={`${arrival.trainLineNm}-${arrival.recptnDt}-${idx}`} arrival={arrival} />
      ))}
    </View>
  );
}

/**
 * 운행 중 열차 가로 스크롤
 */
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
  loadingBox: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  horizontalContent: {
    paddingRight: spacing.lg, // 마지막 카드 우측 여유
  },
  footerSpacer: { height: spacing.xxl },
});
