// 역 선택 화면 (Phase 1)
//
// 두 모드를 지원:
//   - "departure"   (기본): 출발역 선택 → setStation
//   - "destination":      도착역 선택 → setDestination
//                          출발역과 같은 역은 비활성("출발역" 힌트 표시)
//
// 흐름:
//   HomeScreen / FavoritesScreen 등에서 navigation.navigate("StationPicker", { mode })
//   → 검색/리스트에서 선택 → setStation 또는 setDestination → navigation.goBack()

import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchBar from "../components/SearchBar";
import StationListItem from "../components/StationListItem";
import {
  CHOSUNG_ORDER,
  LINE_4_STATIONS,
  StationInfo,
} from "../constants/line4Stations";
import { useFavorites } from "../contexts/FavoritesContext";
import { useStation } from "../contexts/StationContext";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Section {
  title: string;
  data: StationInfo[];
}

type Route = RouteProp<RootStackParamList, "StationPicker">;

export default function StationPickerScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const mode = route.params?.mode ?? "departure";

  const { station, destination, setStation, setDestination } = useStation();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [query, setQuery] = useState("");

  // mode별 표시값
  const isDestinationMode = mode === "destination";
  const headerTitle = isDestinationMode ? "도착역 선택" : "출발역 선택";
  /** 현재 선택된 값 (체크 표시용) */
  const currentSelection = isDestinationMode ? destination : station;
  /** 도착역 모드에서는 출발역(station)이 비활성 */
  const disabledStation = isDestinationMode ? station : null;

  /**
   * 섹션 데이터 구성
   * - 검색어 있음 → 단일 섹션
   * - 없음 → 자주 가는 역 + 가나다순
   */
  const sections: Section[] = useMemo(() => {
    const q = query.trim();
    if (q) {
      const filtered = LINE_4_STATIONS.filter((s) => s.name.includes(q));
      return filtered.length > 0
        ? [{ title: `검색 결과 (${filtered.length})`, data: filtered }]
        : [];
    }

    const favSet = new Set(favorites.map((f) => f.stationName));
    const favStations = LINE_4_STATIONS.filter((s) => favSet.has(s.name));

    const byChosung = new Map<string, StationInfo[]>();
    LINE_4_STATIONS.forEach((s) => {
      if (!byChosung.has(s.chosung)) byChosung.set(s.chosung, []);
      byChosung.get(s.chosung)!.push(s);
    });

    const chosungSections: Section[] = CHOSUNG_ORDER
      .filter((c) => byChosung.has(c))
      .map((c) => ({
        title: c,
        data: byChosung.get(c)!.sort((a, b) => a.name.localeCompare(b.name, "ko")),
      }));

    const result: Section[] = [];
    if (favStations.length > 0) {
      result.push({ title: "⭐ 자주 가는 역", data: favStations });
    }
    result.push(...chosungSections);
    return result;
  }, [query, favorites]);

  /** 역 선택 — mode에 따라 setStation 또는 setDestination */
  const handleSelect = (name: string) => {
    if (isDestinationMode) {
      setDestination(name);
    } else {
      setStation(name);
    }
    navigation.goBack();
  };

  /** ⭐ 즐겨찾기 토글 — mode와 무관 */
  const handleToggleFavorite = (name: string) => {
    const fav = favorites.find((f) => f.stationName === name);
    if (fav) removeFavorite(fav.id);
    else addFavorite(name);
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
        <Text style={styles.title}>{headerTitle}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 도착역 모드 보조 안내 */}
      {isDestinationMode && (
        <View style={styles.modeHint}>
          <Text style={styles.modeHintText}>
            출발역: <Text style={styles.modeHintAccent}>{station}</Text>
          </Text>
        </View>
      )}

      {/* 검색바 */}
      <View style={styles.searchWrap}>
        <SearchBar value={query} onChange={setQuery} autoFocus={false} />
      </View>

      {/* 리스트 */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => {
          const isDisabled = disabledStation === item.name;
          return (
            <StationListItem
              name={item.name}
              isTransfer={item.isTransfer}
              isCurrent={item.name === currentSelection}
              isFavorite={isFavorite(item.name)}
              disabled={isDisabled}
              disabledHint={isDisabled ? "출발역" : undefined}
              onPress={() => handleSelect(item.name)}
              onToggleFavorite={() => handleToggleFavorite(item.name)}
            />
          );
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>"{query}"에 해당하는 4호선 역이 없어요</Text>
            <Text style={styles.emptySub}>오타 한 번 확인해볼까요?</Text>
          </View>
        }
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
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

  modeHint: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  modeHintText: { ...typography.caption, color: colors.textSecondary },
  modeHintAccent: { color: colors.accent, fontWeight: "600" },

  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  empty: { alignItems: "center", paddingTop: spacing.xxxl, paddingHorizontal: spacing.lg },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { ...typography.bodyLg, color: colors.textPrimary, textAlign: "center" },
  emptySub: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
