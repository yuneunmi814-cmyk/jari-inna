// 즐겨찾기 화면 — Phase 4에서 본격 구현 예정 (스와이프 삭제 등)
// 현재는 RootNavigator의 import 만족용 placeholder

import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export default function FavoritesScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>즐겨찾기</Text>
        <Text style={styles.note}>Phase 4에서 구현 예정</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← 뒤로</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, justifyContent: "center", alignItems: "center" },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
  note: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
  back: { padding: spacing.md },
  backText: { ...typography.body, color: colors.accent },
});
