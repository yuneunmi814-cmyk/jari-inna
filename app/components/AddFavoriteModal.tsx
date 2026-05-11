// 경로 즐겨찾기 추가 모달
//
// Phase 1 흐름:
//   - HomeScreen에서 출발/도착이 채워졌을 때만 "이 경로 즐겨찾기 추가" 버튼이 활성
//   - 버튼 탭 → 이 모달 열림, 출발/도착은 prefill되어 표시(읽기 전용)
//   - 사용자는 라벨/아이콘만 입력 → 저장
//
// 출발/도착 picker는 Phase 2에서 추가 예정 (지금은 HomeScreen 컨텍스트 활용).

import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { FAVORITE_ICON_CHOICES } from "../types/favorites";
import type { NewFavoriteRoute } from "../types/favorites";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

interface Props {
  visible: boolean;
  /** 동작 모드: "create"(기본) — 새 추가 / "edit" — 기존 항목 수정 */
  mode?: "create" | "edit";
  /** prefill된 출발역 (필수) */
  departure: string;
  /** prefill된 도착역 (필수) */
  destination: string;
  /** edit 모드용: 기존 라벨 초기값 */
  initialLabel?: string;
  /** edit 모드용: 기존 아이콘 초기값 (그리드에 있으면 그리드 선택, 없으면 커스텀 입력에 prefill) */
  initialIcon?: string;
  onSubmit: (input: NewFavoriteRoute) => void | Promise<void>;
  onCancel: () => void;
}

export default function AddFavoriteModal({
  visible,
  mode = "create",
  departure,
  destination,
  initialLabel,
  initialIcon,
  onSubmit,
  onCancel,
}: Props) {
  const [label, setLabel] = useState("");

  // 추천 그리드에서 선택된 이모지 (null이면 미선택 → 커스텀 입력 활성)
  const [gridIcon, setGridIcon] = useState<string | null>(FAVORITE_ICON_CHOICES[0]);
  // 커스텀 입력 (텍스트로 받아 이모지 자유 입력 허용)
  const [customIcon, setCustomIcon] = useState("");

  // 최종 저장될 아이콘 — 커스텀 입력이 우선, 없으면 그리드 선택
  const finalIcon = customIcon.trim() || gridIcon || "";

  // 모달 열릴 때마다 입력 초기화 (mode/initialValues 반영)
  useEffect(() => {
    if (!visible) return;
    setLabel(initialLabel ?? "");

    const seed = initialIcon ?? FAVORITE_ICON_CHOICES[0];
    // initialIcon이 추천 풀에 있으면 그리드 선택, 없으면 커스텀 입력으로 prefill
    const inPool = (FAVORITE_ICON_CHOICES as readonly string[]).includes(seed);
    if (inPool) {
      setGridIcon(seed);
      setCustomIcon("");
    } else {
      setGridIcon(null);
      setCustomIcon(seed);
    }
  }, [visible, initialLabel, initialIcon]);

  const canSave = label.trim().length > 0 && finalIcon.length > 0;

  /** 추천 그리드 선택 → 커스텀 입력 자동 비움 (mutex) */
  const handleGridSelect = (choice: string) => {
    setGridIcon(choice);
    setCustomIcon("");
  };

  /** 커스텀 입력 변경 → 추천 그리드 선택 자동 해제 (mutex) */
  const handleCustomChange = (text: string) => {
    setCustomIcon(text);
    if (text.length > 0) setGridIcon(null);
    // 비우면 기본값으로 복귀 — 의도치 않은 "아무것도 선택 안 된" 상태 방지
    if (text.length === 0 && gridIcon === null) {
      setGridIcon(FAVORITE_ICON_CHOICES[0]);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    await onSubmit({
      label: label.trim(),
      icon: finalIcon,
      departure,
      destination,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* 어두운 오버레이 — 바깥쪽 탭하면 취소 */}
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          {/* 시트 내부는 탭 흡수 (닫힘 방지) */}
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.sheet}
            >
              <Text style={styles.title}>
                {mode === "edit" ? "즐겨찾기 수정" : "새 즐겨찾기"}
              </Text>
              <Text style={styles.subtitle}>
                {mode === "edit"
                  ? "이름과 아이콘을 다듬어보세요"
                  : "자주 가는 경로에 라벨을 붙여 빠르게 불러올 수 있어요"}
              </Text>

              {/* prefill된 경로 — 읽기 전용 */}
              <View style={styles.routePreview}>
                <Text style={styles.routeStation} numberOfLines={1}>
                  {departure}
                </Text>
                <Text style={styles.routeArrow}>→</Text>
                <Text style={styles.routeStation} numberOfLines={1}>
                  {destination}
                </Text>
              </View>

              {/* 라벨 입력 */}
              <Text style={styles.fieldLabel}>이름</Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="예: 출근, 퇴근, 본가..."
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
                maxLength={20}
                autoFocus
                keyboardAppearance="light"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              {/* 아이콘 선택 — 추천 그리드 */}
              <Text style={styles.fieldLabel}>아이콘</Text>
              <View style={styles.iconRow}>
                {FAVORITE_ICON_CHOICES.map((choice) => {
                  // 커스텀이 입력되면 그리드는 모두 inactive (gridIcon이 null이 됨)
                  const active = choice === gridIcon;
                  return (
                    <Pressable
                      key={choice}
                      onPress={() => handleGridSelect(choice)}
                      style={[
                        styles.iconChoice,
                        active ? styles.iconChoiceActive : styles.iconChoiceInactive,
                      ]}
                    >
                      <Text style={styles.iconChoiceText}>{choice}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* 커스텀 이모지 입력 */}
              <Text style={[styles.fieldLabel, styles.customLabel]}>또는 직접 입력</Text>
              <TextInput
                value={customIcon}
                onChangeText={handleCustomChange}
                placeholder="예: 🏢  🏫  ☕  🍻"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  customIcon.length > 0 && styles.inputActive,
                ]}
                maxLength={8}
                keyboardAppearance="light"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              {/* 버튼 영역 */}
              <View style={styles.actions}>
                <Pressable
                  onPress={onCancel}
                  style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.btnGhostText}>취소</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={!canSave}
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnPrimary,
                    !canSave && styles.btnDisabled,
                    pressed && canSave && { opacity: 0.85 },
                  ]}
                  android_ripple={canSave ? { color: colors.ripplePrimary } : undefined}
                >
                  <Text style={styles.btnPrimaryText}>저장</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    fontSize: 22,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  routePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  routeStation: {
    ...typography.bodyLg,
    color: colors.textPrimary,
    fontWeight: "600",
    flexShrink: 1,
  },
  routeArrow: {
    ...typography.bodyLg,
    color: colors.accent,
    marginHorizontal: spacing.md,
    fontWeight: "700",
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    ...typography.bodyLg,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // 커스텀 이모지 입력이 활성(값 있음)일 때 시안 보더 강조
  inputActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + "0F", // ~6% — 매우 옅게
  },
  // "또는 직접 입력" 라벨 — 위쪽 여유로 그리드와 시각적 구분
  customLabel: {
    marginTop: spacing.lg,
  },
  // 3개 추천 — 가로 한 줄 균등 분할 (flex: 1)
  iconRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  iconChoice: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  iconChoiceActive: {
    backgroundColor: colors.accent + "1A",
    borderColor: colors.accent,
  },
  iconChoiceInactive: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  iconChoiceText: { fontSize: 28 },

  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    alignItems: "center",
  },
  btnGhost: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhostText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnDisabled: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrimaryText: {
    ...typography.button,
    color: colors.textPrimary,
    fontWeight: "700",
  },
});
