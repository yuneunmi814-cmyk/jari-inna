// 경로 즐겨찾기 화면 (도쿄메트로 my! 패턴)
//
// 구성:
//   1) 헤더: ← 뒤로 + "⭐ 즐겨찾기"
//   2) 비어있으면 EmptyState + "+ 새 즐겨찾기 추가"
//   3) FavoriteRouteCard 리스트 (최신순)
//   4) 하단 floating "+ 새 즐겨찾기 추가" 버튼
//
// 추가 흐름:
//   사용자가 HomeScreen에서 출발/도착 둘 다 고른 상태일 때만 새 추가 가능.
//   둘 중 하나라도 없으면 Alert로 안내 + HomeScreen으로 이동.
//
// 카드 탭 → setTrip(departure, destination) + navigation.navigate("Home")

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddFavoriteModal from "../components/AddFavoriteModal";
import EmptyState from "../components/EmptyState";
import FavoriteRouteCard from "../components/FavoriteRouteCard";
import { useRouteFavorites } from "../contexts/RouteFavoritesContext";
import { useStation } from "../contexts/StationContext";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { shadows } from "../theme/shadows";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { confirmAlert } from "../utils/confirmDialog";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Favorites">;

export default function FavoritesScreen() {
  const navigation = useNavigation<NavProp>();
  const { station, destination, setTrip } = useStation();
  const { routes, addRoute, removeRoute } = useRouteFavorites();
  const [modalVisible, setModalVisible] = useState(false);

  /** 카드 탭 → 출발/도착 적용 + 홈으로 */
  const handleUseRoute = (departure: string, dest: string) => {
    setTrip(departure, dest);
    navigation.navigate("Home");
  };

  /**
   * 카드 삭제 — 크로스 플랫폼 확인 다이얼로그
   * web: window.confirm, native: Alert.alert
   */
  const handleDelete = (id: string, label: string) => {
    confirmAlert({
      title: "즐겨찾기 삭제",
      message: `'${label}'을(를) 즐겨찾기에서 빼시겠어요?`,
      confirmText: "삭제",
      cancelText: "취소",
      destructive: true,
      onConfirm: () => removeRoute(id),
    });
  };

  /** + 새 즐겨찾기 추가 버튼 — 도착역 없으면 안내 후 홈으로 */
  const handleAddPress = () => {
    if (!destination) {
      confirmAlert({
        title: "도착역을 먼저 골라주세요",
        message: "홈에서 출발역/도착역을 정하면 이 경로를 즐겨찾기에 추가할 수 있어요.",
        confirmText: "홈으로 가기",
        cancelText: "취소",
        onConfirm: () => navigation.navigate("Home"),
      });
      return;
    }
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>⭐ 즐겨찾기</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 리스트 / 빈 상태 */}
      {routes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            emoji="⭐"
            title="아직 즐겨찾기가 없어요"
            description="자주 가는 경로를 등록해두면 한 번에 불러올 수 있어요"
          />
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <FavoriteRouteCard
              route={item}
              onUse={() => handleUseRoute(item.departure, item.destination)}
              onDelete={() => handleDelete(item.id, item.label)}
            />
          )}
        />
      )}

      {/* 하단 floating 추가 버튼 */}
      <View style={styles.addWrap}>
        <Pressable
          onPress={handleAddPress}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
          android_ripple={{ color: colors.ripplePrimary }}
        >
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addText}>새 즐겨찾기 추가</Text>
        </Pressable>
      </View>

      {/* 추가 모달 — 출발/도착은 현재 Context 값으로 prefill */}
      <AddFavoriteModal
        visible={modalVisible}
        departure={station}
        destination={destination ?? ""}
        onCancel={() => setModalVisible(false)}
        onSubmit={async (input) => {
          await addRoute(input);
          setModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: { width: 40 },
  backText: { fontSize: 24, color: colors.textPrimary },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  headerRight: { width: 40 },

  emptyWrap: { flex: 1, justifyContent: "center" },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 100, // 하단 floating 버튼 여유
  },
  separator: { height: spacing.sm },

  addWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    ...shadows.elevated,
  },
  addIcon: {
    ...typography.h2,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  addText: {
    ...typography.button,
    color: colors.textPrimary,
    fontWeight: "700",
  },
});
