// 즐겨찾기 화면 (Phase 1)
//
// 구성:
//   1) 헤더: ← 뒤로 + "즐겨찾기"
//   2) 상단 CTA: "현재 출발역(○○)을 즐겨찾기에 추가" — 이미 추가된 역이면 비활성
//   3) 즐겨찾기 리스트 (최신순):
//      - 좌측: 역명 + 추가 시각
//      - 우측: ⓧ 삭제 버튼
//   4) 비어있을 때: 일러스트 + 안내 카피
//
// ⚠️ 스와이프 삭제는 Phase 1 이후. gesture-handler 통합 시간 부족.
//    당분간 명시적 삭제 버튼 사용 — 안드로이드 머티리얼 가이드라인에도 부합.

import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import { useFavorites } from "../contexts/FavoritesContext";
import { useStation } from "../contexts/StationContext";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Favorites">;

/**
 * 추가 시각을 "방금 추가" / "N분 전" / "오늘 HH:MM" / "MM/DD" 형태로
 */
function formatAddedAt(ts: number): string {
  const now = Date.now();
  const diffMin = Math.floor((now - ts) / 60000);
  if (diffMin < 1) return "방금 추가";
  if (diffMin < 60) return `${diffMin}분 전`;
  const d = new Date(ts);
  const today = new Date();
  if (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  ) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `오늘 ${hh}:${mm}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function FavoritesScreen() {
  const navigation = useNavigation<NavProp>();
  const { station: currentStation } = useStation();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  const alreadyAdded = isFavorite(currentStation);

  const handleAddCurrent = () => {
    if (alreadyAdded) return;
    addFavorite(currentStation);
  };

  const handleRemove = (id: string, name: string) => {
    Alert.alert(
      "즐겨찾기에서 빼기",
      `'${name}'을(를) 즐겨찾기에서 빼시겠어요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "빼기",
          style: "destructive",
          onPress: () => removeFavorite(id),
        },
      ]
    );
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
        <Text style={styles.title}>즐겨찾기</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 현재 출발역 추가 CTA */}
      <View style={styles.ctaWrap}>
        <Pressable
          onPress={handleAddCurrent}
          disabled={alreadyAdded}
          style={({ pressed }) => [
            styles.cta,
            alreadyAdded && styles.ctaDisabled,
            pressed && !alreadyAdded && { backgroundColor: colors.surfaceElevated },
          ]}
          android_ripple={
            alreadyAdded ? undefined : { color: colors.surfaceElevated, borderless: false }
          }
        >
          <Text style={styles.ctaIcon}>{alreadyAdded ? "✓" : "⭐"}</Text>
          <Text style={[styles.ctaText, alreadyAdded && { color: colors.textSecondary }]}>
            {alreadyAdded
              ? `'${currentStation}'은(는) 이미 추가됨`
              : `현재 출발역 '${currentStation}' 추가하기`}
          </Text>
        </Pressable>
      </View>

      {/* 리스트 */}
      {favorites.length === 0 ? (
        <EmptyState
          emoji="⭐"
          title="아직 즐겨찾기가 없어요"
          description="자주 가는 역을 추가해두면 빠르게 갈 수 있어요"
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.stationName}>{item.stationName}</Text>
                <Text style={styles.addedAt}>{formatAddedAt(item.addedAt)}</Text>
              </View>
              <Pressable
                onPress={() => handleRemove(item.id, item.stationName)}
                hitSlop={12}
                style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.5 }]}
              >
                <Text style={styles.removeIcon}>✕</Text>
              </Pressable>
            </View>
          )}
        />
      )}
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

  ctaWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaIcon: { fontSize: 20, marginRight: spacing.md },
  ctaText: { ...typography.bodyLg, color: colors.textPrimary, flex: 1 },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  separator: { height: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLeft: { flex: 1 },
  stationName: { ...typography.h3, color: colors.textPrimary, fontSize: 18 },
  addedAt: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  removeIcon: { fontSize: 18, color: colors.textSecondary },
});
