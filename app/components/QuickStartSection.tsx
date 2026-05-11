// ⚡ 빠른 출발 섹션 — 즐겨찾기 1탭 사용 + 편집 모드
//
// 두 상태:
//   - 보기 모드(기본): 헤더 우측 ✏️ 아이콘, 카드 탭하면 즐겨찾기 적용
//   - 편집 모드: 헤더 우측 "완료" 텍스트, 각 카드에 X(삭제) + ✏️(수정)
//
// 수정은 AddFavoriteModal을 mode="edit"로 재사용. prefill로 기존 라벨/아이콘 표시.
// 출발/도착은 Phase 1에선 수정 불가(라벨/아이콘만 변경).

import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouteFavorites } from "../contexts/RouteFavoritesContext";
import type { FavoriteRoute } from "../types/favorites";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { confirmAlert } from "../utils/confirmDialog";
import AddFavoriteModal from "./AddFavoriteModal";
import QuickStartCard from "./QuickStartCard";

interface Props {
  routes: FavoriteRoute[];
  onUseRoute: (route: FavoriteRoute) => void;
  /** + 카드 누름 — FavoritesScreen 이동 등 */
  onAddNew: () => void;
}

export default function QuickStartSection({ routes, onUseRoute, onAddNew }: Props) {
  const { removeRoute, editRoute } = useRouteFavorites();

  // 편집 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  // 현재 수정 중인 카드 (null이면 수정 모달 닫힘)
  const [editing, setEditing] = useState<FavoriteRoute | null>(null);

  const hasItems = routes.length > 0;

  /** 삭제 — confirmAlert로 확인 후 */
  const handleDelete = (route: FavoriteRoute) => {
    confirmAlert({
      title: "즐겨찾기 삭제",
      message: `'${route.label}'을(를) 삭제할까요?`,
      confirmText: "삭제",
      cancelText: "취소",
      destructive: true,
      onConfirm: () => removeRoute(route.id),
    });
  };

  /** 수정 — 모달 열기 */
  const handleEdit = (route: FavoriteRoute) => {
    setEditing(route);
  };

  /** 수정 저장 */
  const handleEditSubmit = async (input: {
    label: string;
    icon: string;
    departure: string;
    destination: string;
  }) => {
    if (!editing) return;
    // Phase 1: 라벨/아이콘만 업데이트 (출발/도착은 수정 안 함)
    await editRoute(editing.id, { label: input.label, icon: input.icon });
    setEditing(null);
  };

  return (
    <View style={styles.wrap}>
      {/* 헤더 — 보기 모드: ✏️ / 편집 모드: 완료 */}
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>⚡ 빠른 출발</Text>
        {hasItems && (
          <Pressable
            onPress={() => setIsEditMode((v) => !v)}
            hitSlop={12}
            style={({ pressed }) => [
              styles.headerAction,
              pressed && { opacity: 0.5 },
            ]}
            accessibilityLabel={isEditMode ? "편집 완료" : "편집 모드 진입"}
            accessibilityRole="button"
          >
            {isEditMode ? (
              <Text style={styles.doneText}>완료</Text>
            ) : (
              <Text style={styles.editIconText}>✎</Text>
            )}
          </Pressable>
        )}
      </View>

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        nestedScrollEnabled
        // 편집 모드 진입/종료 시 리렌더 보장 (extraData)
        extraData={isEditMode}
        renderItem={({ item }) => (
          <QuickStartCard
            route={item}
            onPress={() => onUseRoute(item)}
            isEditMode={isEditMode}
            onDelete={() => handleDelete(item)}
            onEdit={() => handleEdit(item)}
          />
        )}
        ListFooterComponent={
          // 편집 모드일 땐 + 카드 숨김 (편집 흐름 단순화)
          isEditMode ? null : (
            <View style={hasItems ? styles.gap : undefined}>
              <AddCard onPress={onAddNew} hasItems={hasItems} />
            </View>
          )
        }
      />

      {/* 수정 모달 — mode="edit"로 재사용 */}
      <AddFavoriteModal
        visible={editing !== null}
        mode="edit"
        departure={editing?.departure ?? ""}
        destination={editing?.destination ?? ""}
        initialLabel={editing?.label}
        initialIcon={editing?.icon}
        onCancel={() => setEditing(null)}
        onSubmit={handleEditSubmit}
      />
    </View>
  );
}

/** "+" 추가 카드 — 마지막 또는 빈 상태에서 표시 */
function AddCard({ onPress, hasItems }: { onPress: () => void; hasItems: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.addCard, pressed && { opacity: 0.7 }]}
      android_ripple={{ color: colors.rippleOnSurface, borderless: false }}
      accessibilityLabel="새 즐겨찾기 추가"
      accessibilityRole="button"
    >
      <Text style={styles.addIcon}>+</Text>
      <Text style={styles.addText}>
        {hasItems ? "추가" : "자주 가는 경로 추가"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  // 헤더 — 좌 타이틀 / 우 액션(✏️ or 완료)
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerText: {
    ...typography.h3,
    fontSize: 16,
    color: colors.textPrimary,
  },
  headerAction: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  editIconText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  doneText: {
    ...typography.button,
    color: colors.primary,
    fontWeight: "700",
  },

  list: {
    paddingHorizontal: spacing.lg,
    // X/✏️ 버튼이 카드 top에서 살짝 튀어나오는 경우 잘림 방지
    paddingTop: 4,
    paddingBottom: 4,
  },
  gap: { width: spacing.sm },

  // "+" 카드
  addCard: {
    width: 156,
    minHeight: 104,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  addIcon: {
    fontSize: 32,
    color: colors.primary,
    fontWeight: "700",
    lineHeight: 34,
  },
  addText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
