// 역 선택 화면 (Phase 2 — 1~9호선 지원)
//
// 흐름:
//   1) 상단 헤더 + 검색바
//   2) LineFilterChips (전체/1호선~9호선)
//   3) 검색 모드 (query 있음): ALL_DISPLAY_STATIONS에서 검색 (호선 필터 무시)
//   4) 필터 모드: 선택된 호선의 역만 + 자주 가는 역 + 가나다 SectionList
//   5) 환승역 탭 → LineSelectModal (B2)
//
// 데이터 source:
//   - utils/stationLookup.ts의 getStationsForFilter()
//   - 4호선은 KORAIL/남양주까지 47개, 다른 호선은 서울교통/메트로9 직영 구간

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
import LineFilterChips, {
  type LineFilterKey,
} from "../components/LineFilterChips";
import LineSelectModal from "../components/LineSelectModal";
import SearchBar from "../components/SearchBar";
import StationListItem from "../components/StationListItem";
import { CHOSUNG_ORDER } from "../constants/line4Stations";
import { TRANSFER_STATIONS, type LineKey } from "../constants/lines";
import { useFavorites } from "../contexts/FavoritesContext";
import { useStation } from "../contexts/StationContext";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import {
  getStationsForFilter,
  searchAllStations,
  type DisplayStation,
} from "../utils/stationLookup";

interface Section {
  title: string;
  data: DisplayStation[];
}

type Route = RouteProp<RootStackParamList, "StationPicker">;

export default function StationPickerScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const mode = route.params?.mode ?? "departure";

  const {
    station,
    departureLine,
    destination,
    setStation,
    setDestination,
  } = useStation();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  const [query, setQuery] = useState("");
  // 호선 필터 — 기본: 출발역의 호선 (예: 4호선이 기본이면 4)
  const [lineFilter, setLineFilter] = useState<LineFilterKey>(
    departureLine ?? "4"
  );

  // mode별 표시값
  const isDestinationMode = mode === "destination";
  const headerTitle = isDestinationMode ? "도착역 선택" : "출발역 선택";
  const currentSelection = isDestinationMode ? destination : station;
  const disabledStation = isDestinationMode ? station : null;

  // 검색 중 여부
  const isSearching = query.trim().length > 0;

  /**
   * 섹션 데이터 구성
   * - 검색 모드: 단일 섹션 "검색 결과 (N)"
   * - 필터 모드: 자주 가는 역(있으면) + 가나다 섹션들
   */
  const sections: Section[] = useMemo(() => {
    if (isSearching) {
      const found = searchAllStations(query);
      console.log("[StationPicker] 검색어:", query, "결과:", found.length);
      return found.length > 0
        ? [{ title: `검색 결과 (${found.length})`, data: found }]
        : [];
    }

    const stations = getStationsForFilter(lineFilter);

    // 자주 가는 역 (즐겨찾기) 중 현재 필터에 있는 것만
    const favSet = new Set(favorites.map((f) => f.stationName));
    const favStations = stations.filter((s) => favSet.has(s.name));

    // 가나다순 그룹핑
    const byChosung = new Map<string, DisplayStation[]>();
    for (const s of stations) {
      if (!byChosung.has(s.chosung)) byChosung.set(s.chosung, []);
      byChosung.get(s.chosung)!.push(s);
    }

    const chosungSections: Section[] = CHOSUNG_ORDER
      .filter((c) => byChosung.has(c))
      .map((c) => ({
        title: c,
        data: byChosung.get(c)!.sort((a, b) => a.name.localeCompare(b.name, "ko")),
      }));

    // 알려지지 않은 초성 (# 등) 마지막에
    const knownChosung = new Set(CHOSUNG_ORDER);
    const otherSections: Section[] = [];
    for (const [c, items] of byChosung) {
      if (!knownChosung.has(c)) {
        otherSections.push({ title: c, data: items });
      }
    }

    const result: Section[] = [];
    if (favStations.length > 0) {
      result.push({ title: "⭐ 자주 가는 역", data: favStations });
    }
    result.push(...chosungSections, ...otherSections);
    return result;
  }, [isSearching, query, lineFilter, favorites]);

  // 환승역 모달 pending state
  const [pending, setPending] = useState<{ name: string; lines: LineKey[] } | null>(null);

  /** 역 선택 — 환승역이면 모달, 단일이면 즉시 적용 */
  const handleSelect = (item: DisplayStation) => {
    if (item.lines.length > 1) {
      console.log("[StationPicker] 환승역 선택:", item.name, item.lines);
      setPending({ name: item.name, lines: item.lines });
      return;
    }
    finalizeSelection(item.name, item.lines[0]);
  };

  /** 호선 결정 후 최종 적용 + 화면 닫기 */
  const finalizeSelection = (name: string, lineCode: LineKey) => {
    console.log("[StationPicker] finalize:", { name, lineCode, mode });
    if (isDestinationMode) {
      setDestination(name, lineCode);
    } else {
      setStation(name, lineCode);
    }
    setPending(null);
    navigation.goBack();
  };

  /** ⭐ 즐겨찾기 토글 */
  const handleToggleFavorite = (name: string) => {
    const fav = favorites.find((f) => f.stationName === name);
    if (fav) removeFavorite(fav.id);
    else addFavorite(name);
  };

  /** 호선 필터 변경 — 디버그 로그 + 검색어 유지 */
  const handleFilterChange = (key: LineFilterKey) => {
    console.log("[StationPicker] 호선 필터:", lineFilter, "→", key);
    setLineFilter(key);
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

      {/* 호선 필터 칩 (검색 중엔 비활성) */}
      <LineFilterChips
        selected={lineFilter}
        onChange={handleFilterChange}
        disabled={isSearching}
      />

      {/* 리스트 */}
      <SectionList
        sections={sections}
        keyExtractor={(item, idx) => `${item.name}-${idx}`}
        renderItem={({ item }) => {
          const isDisabled = disabledStation === item.name;
          return (
            <StationListItem
              name={item.name}
              isCurrent={item.name === currentSelection}
              isFavorite={isFavorite(item.name)}
              lines={item.lines}
              disabled={isDisabled}
              disabledHint={isDisabled ? "출발역" : undefined}
              onPress={() => handleSelect(item)}
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
            <Text style={styles.emptyTitle}>
              {isSearching
                ? `"${query}"에 해당하는 역이 없어요`
                : "이 호선에는 역이 없어요"}
            </Text>
            <Text style={styles.emptySub}>
              {isSearching ? "오타 한 번 확인해볼까요?" : "다른 호선을 골라보세요"}
            </Text>
          </View>
        }
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
      />

      {/* 환승역 선택 시 호선 모달 */}
      <LineSelectModal
        visible={pending !== null}
        stationName={pending?.name ?? ""}
        lines={pending?.lines ?? []}
        onSelect={(ln) => {
          if (pending) finalizeSelection(pending.name, ln);
        }}
        onCancel={() => setPending(null)}
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
    paddingBottom: spacing.sm,
  },

  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
