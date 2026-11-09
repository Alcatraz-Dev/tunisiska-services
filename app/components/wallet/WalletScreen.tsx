import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@clerk/clerk-expo";

import ThemedText from "@/app/components/ui/ThemedText";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import PressableScale from "@/app/components/ui/PressableScale";
import EmptyState from "@/app/components/ui/EmptyState";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";
import { currentDateLocale } from "@/app/lib/time";

type WalletTransaction = { id: string; type: "earned" | "spent" | "withdrawn"; points: number; description: string; date: string };

export default function WalletScreen() {
  const { user } = useUser();
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const metadata = user.unsafeMetadata as { points?: number; transactions?: WalletTransaction[] };
    setTransactions(metadata.transactions ?? []);
    try {
      const { client } = await import("@/sanityClient");
      const balance = await client.fetch(`*[_type == "users" && clerkId == $clerkId][0].points`, { clerkId: user.id });
      setPoints(typeof balance === "number" ? balance : metadata.points ?? 0);
    } catch {
      setPoints(metadata.points ?? 0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
    <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
    <ScreenHeader title="Wallet" subtitle="Points and transactions" showBack />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 44 }}>
      <LinearGradient colors={["#132B55", "#0B1B33"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radii.xl, padding: spacing.xl, marginTop: spacing.sm, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><ThemedText variant="bodySm" style={{ color: "#D9E2F1" }}>Available balance</ThemedText><AppIcon name="wallet-outline" size={20} color="#FFFFFF" /></View>
        <ThemedText variant="numericLg" style={{ color: "#FFFFFF", marginTop: spacing.sm }}>{loading ? "—" : `${((points / 100) * 10).toFixed(2)} SEK`}</ThemedText>
        <ThemedText variant="caption" style={{ color: "#D9E2F1", marginTop: 4 }}>{loading ? "Loading points…" : `${points.toLocaleString(currentDateLocale())} points`}</ThemedText>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
          <WalletAction icon="add" label="Top up" onPress={() => router.push("/(home)/profile/wallet")} />
          <WalletAction icon="swap-horizontal" label="Transfer" onPress={() => router.push("/(home)/profile/transfer-points")} />
        </View>
      </LinearGradient>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xl, marginBottom: spacing.sm }}>
        <ThemedText variant="title3">Recent transactions</ThemedText>
        {transactions.length > 0 ? <ThemedText variant="caption" tone="secondary">{transactions.length} total</ThemedText> : null}
      </View>
      {transactions.length === 0 ? <View style={{ backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.border, paddingHorizontal: spacing.md }}>
        <EmptyState icon="receipt-outline" title="No transactions yet" description="Your points activity will appear here." style={{ paddingVertical: spacing.xl }} />
      </View> : <View style={{ backgroundColor: theme.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
        {transactions.slice(0, 12).map((transaction, index) => {
          const positive = transaction.type === "earned";
          return <View key={transaction.id} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderBottomWidth: index === Math.min(transactions.length, 12) - 1 ? 0 : 1, borderColor: theme.borderSubtle }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: positive ? theme.accentSoft : theme.primarySoft, alignItems: "center", justifyContent: "center" }}><AppIcon name={positive ? "arrow-down-outline" : "arrow-up-outline"} size={18} color={positive ? theme.accent : theme.primary} /></View>
            <View style={{ flex: 1, gap: 2 }}><ThemedText variant="headline" numberOfLines={1}>{transaction.description}</ThemedText><ThemedText variant="caption" tone="secondary">{new Date(transaction.date).toLocaleDateString(currentDateLocale())}</ThemedText></View>
            <ThemedText variant="headline" style={{ color: positive ? "#147A48" : theme.textPrimary }}>{positive ? "+" : "−"}{transaction.points}</ThemedText>
          </View>;
        })}
      </View>}
    </ScrollView>
  </SafeAreaView>;
}

function WalletAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <PressableScale onPress={onPress} haptic="light" style={{ flex: 1, minHeight: 46, borderRadius: radii.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}><AppIcon name={icon} size={17} color="#FFFFFF" /><ThemedText variant="button" style={{ color: "#FFFFFF" }}>{label}</ThemedText></PressableScale>;
}
