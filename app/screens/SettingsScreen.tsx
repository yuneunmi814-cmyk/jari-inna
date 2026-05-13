// 설정 화면 (v1.0)
//
// 구성:
//   1) 헤더 — 좌측 ← 뒤로 + 중앙 "설정"
//   2) SectionList — 3개 그룹
//      [데이터 관리] 즐겨찾기 초기화 / 최근 검색 기록 삭제 / 모든 데이터 초기화(빨강)
//      [위치]       위치 권한 상태(허용/거부/미설정) / 시스템 설정 열기
//      [정보]       앱 버전 / 개발자 / 문의하기 / 개인정보처리방침
//
// 디자인:
//   - iOS 네이티브 설정 화면 톤 (회색 섹션 헤더 + 흰 행 + 구분선)
//   - 액션 가능한 행 우측에 ChevronRight 텍스트(›)
//   - 비활성 행(개발자 등)은 onPress 없음 + 우측 값 표시
//   - 파괴적 액션은 #F44336 빨강 텍스트

import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Location from "expo-location";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFavorites } from "../contexts/FavoritesContext";
import { useRouteFavorites } from "../contexts/RouteFavoritesContext";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { RECENT_KEYS } from "../utils/storageKeys";

const PRIVACY_URL = "https://yuneunmi814-cmyk.github.io/jari-inna/privacy/";
const CONTACT_EMAIL = "yuneunmi814@gmail.com";
const DESTRUCTIVE = "#F44336";

type NavProp = NativeStackNavigationProp<RootStackParamList, "Settings">;

type Row = {
  key: string;
  title: string;
  /** 우측 표시값 (액션 행이면 undefined → '›' 렌더) */
  value?: string;
  /** 탭 가능 여부. 없으면 비활성. */
  onPress?: () => void;
  destructive?: boolean;
};

type Section = {
  title: string;
  data: Row[];
};

/**
 * expo-location 권한 상태 → 한글 라벨.
 * "granted"/"denied" 외에 iOS 의 "limited" 도 처리.
 */
function permissionLabel(
  status: Location.PermissionStatus | "loading" | null
): string {
  switch (status) {
    case "granted":
      return "허용";
    case "denied":
      return "거부";
    case "undetermined":
      return "미설정";
    case "loading":
      return "확인 중...";
    default:
      return "알 수 없음";
  }
}

export default function SettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { clearAll: clearFavoriteStations } = useFavorites();
  const { clearAll: clearFavoriteRoutes } = useRouteFavorites();

  const [permStatus, setPermStatus] = useState<
    Location.PermissionStatus | "loading" | null
  >("loading");

  // 화면 포커스마다 재조회 — 시스템 설정에서 권한 바꾸고 돌아오면 즉시 반영
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Location.getForegroundPermissionsAsync()
        .then((r) => {
          if (!cancelled) setPermStatus(r.status);
        })
        .catch(() => {
          if (!cancelled) setPermStatus(null);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // ── 데이터 관리 핸들러 ──────────────────────────────────────
  const handleResetFavorites = () => {
    Alert.alert(
      "즐겨찾기 초기화",
      "즐겨찾기를 모두 삭제할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            // 단순 역 즐겨찾기 + 경로 즐겨찾기 두 키 모두 삭제 (각 Context 내부에서 keys 단위로)
            await Promise.all([clearFavoriteStations(), clearFavoriteRoutes()]);
            Alert.alert("삭제됨", "모든 즐겨찾기가 삭제되었어요.");
          },
        },
      ]
    );
  };

  const handleResetRecent = () => {
    Alert.alert(
      "최근 검색 기록 삭제",
      "최근에 선택한 출발역·호선 기록을 삭제할까요?\n현재 화면의 선택은 그대로 유지돼요.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove([...RECENT_KEYS]);
            Alert.alert(
              "삭제됨",
              "최근 선택 기록이 삭제되었어요. 다음 실행 시 기본값으로 시작합니다."
            );
          },
        },
      ]
    );
  };

  const handleResetAll = () => {
    Alert.alert(
      "모든 데이터 초기화",
      "모든 즐겨찾기·검색 기록이 삭제됩니다. 계속하시겠어요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "초기화",
          style: "destructive",
          onPress: async () => {
            // AsyncStorage 전체 비우기 — 시티드는 자체 키 4개 외에 외부 보관이 없음.
            // 추가로 메모리 state 도 동기화 (다음 launch 가 아닌 즉시 반영).
            await AsyncStorage.clear();
            await Promise.all([clearFavoriteStations(), clearFavoriteRoutes()]);
            Alert.alert("초기화 완료", "모든 데이터가 삭제되었어요.");
          },
        },
      ]
    );
  };

  // ── 위치 / 정보 ────────────────────────────────────────────
  const handleOpenSystemSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert("열기 실패", "시스템 설정을 열 수 없어요.");
    });
  };

  const handleContact = () => {
    const url = `mailto:${CONTACT_EMAIL}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(
        "메일 앱을 열 수 없어요",
        `직접 보내실 경우: ${CONTACT_EMAIL}`
      );
    });
  };

  const handlePrivacy = () => {
    Linking.openURL(PRIVACY_URL).catch(() => {
      Alert.alert("브라우저를 열 수 없어요", PRIVACY_URL);
    });
  };

  const appVersion =
    Application.nativeApplicationVersion ?? "1.0.0";

  const sections: Section[] = [
    {
      title: "데이터 관리",
      data: [
        {
          key: "reset-favorites",
          title: "즐겨찾기 초기화",
          onPress: handleResetFavorites,
        },
        {
          key: "reset-recent",
          title: "최근 검색 기록 삭제",
          onPress: handleResetRecent,
        },
        {
          key: "reset-all",
          title: "모든 데이터 초기화",
          onPress: handleResetAll,
          destructive: true,
        },
      ],
    },
    {
      title: "위치",
      data: [
        {
          key: "perm-status",
          title: "위치 권한 상태",
          value: permissionLabel(permStatus),
        },
        {
          key: "open-system-settings",
          title: "시스템 설정 열기",
          onPress: handleOpenSystemSettings,
        },
      ],
    },
    {
      title: "정보",
      data: [
        {
          key: "version",
          title: "앱 버전",
          value: appVersion,
        },
        {
          key: "developer",
          title: "개발자",
          value: "프로젝트윤",
        },
        {
          key: "contact",
          title: "문의하기",
          onPress: handleContact,
        },
        {
          key: "privacy",
          title: "개인정보처리방침",
          onPress: handlePrivacy,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityLabel="뒤로"
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.backText}>← 뒤로</Text>
        </Pressable>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item, index, section }) => {
          const isLast = index === section.data.length - 1;
          const isAction = !!item.onPress;
          return (
            <Pressable
              onPress={item.onPress}
              disabled={!isAction}
              android_ripple={
                isAction ? { color: colors.rippleOnSurface } : undefined
              }
              style={({ pressed }) => [
                styles.row,
                !isLast && styles.rowDivider,
                pressed && isAction && { backgroundColor: colors.surfaceElevated },
              ]}
              accessibilityRole={isAction ? "button" : undefined}
            >
              <Text
                style={[
                  styles.rowTitle,
                  item.destructive && { color: DESTRUCTIVE },
                ]}
              >
                {item.title}
              </Text>
              {item.value !== undefined ? (
                <Text style={styles.rowValue}>{item.value}</Text>
              ) : isAction ? (
                <Text style={styles.chevron}>›</Text>
              ) : null}
            </Pressable>
          );
        }}
        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceElevated },

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    minWidth: 56,
    paddingVertical: spacing.xs,
  },
  backText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerRightSpacer: { minWidth: 56 },

  // SectionList
  listContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  sectionHeader: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    textTransform: "none",
    letterSpacing: 0.2,
  },
  sectionGap: { height: 0 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    backgroundColor: colors.background,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowTitle: {
    ...typography.bodyLg,
    color: colors.textPrimary,
    flex: 1,
  },
  rowValue: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.md,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    color: colors.textTertiary,
    marginLeft: spacing.md,
    fontWeight: "400",
  },
});
