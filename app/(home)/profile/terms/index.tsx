import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import EmptyState from "@/app/components/ui/EmptyState";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import { hasRichTextContent, RichTextRenderer } from "@/app/components/ui/RichTextRenderer";
import { client } from "@/sanityClient";
import { termsQuery } from "@/app/hooks/useQuery";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { currentDateLocale } from "@/app/lib/time";
import { useLanguage } from "@/app/hooks/useLanguage";
import { spacing } from "@/app/theme/spacing";

export default function Terms() {
  const { resolvedTheme } = useTheme();
  const theme = useThemeColors();
  const { language } = useLanguage();
  const [terms, setTerms] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchTerms = async () => {
      try {
        const data = await client.fetch(termsQuery);
        if (active) setTerms(data);
      } catch (error) {
        console.error("Error fetching terms:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchTerms();
    return () => { active = false; };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader title={terms?.title || "Terms of Service"} subtitle="Read our terms for using the app." showBack />
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText variant="caption" tone="secondary" style={{ marginTop: spacing.md }}>Loading…</ThemedText>
        </View>
      ) : terms && hasRichTextContent(terms.content) ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: spacing.xxxl }}>
          <RichTextRenderer content={terms.content || []} className={resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"} />
          {terms.lastUpdated ? (
            <ThemedText variant="footnote" tone="tertiary" align="center" translate={false} style={{ marginTop: spacing.xxl }}>
              <><ThemedText variant="footnote" tone="tertiary">Last updated</ThemedText>{" "}{new Intl.DateTimeFormat(currentDateLocale(language), { dateStyle: "long" }).format(new Date(terms.lastUpdated))}</>
            </ThemedText>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.gutter, paddingBottom: 72 }}>
          <EmptyState
            icon="document-text-outline"
            title="Legal information is not available right now."
            description="Please try again later or contact support for help."
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
