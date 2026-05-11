// 역 선택 화면 — Phase 3에서 본격 구현 예정
// 현재는 RootNavigator의 import 만족용 placeholder

import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export default function StationPickerScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>역 선택</Text>
        <Text style={styles.note}>Phase 3에서 구현 예정</Text>
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
