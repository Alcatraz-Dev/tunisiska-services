import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import AppIcon from "@/app/components/ui/AppIcon";
import Badge from "@/app/components/ui/Badge";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import ThemedText from "@/app/components/ui/ThemedText";
import { useThemeColors } from "@/app/theme";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import * as FileSystem from "expo-file-system/legacy";
import { shareAsync } from "expo-sharing";
import { showAlert } from "@/app/utils/showAlert";

export default function AdminBackupScreen() {
  const theme = useThemeColors();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const handleExportData = async () => {
    const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET;
    const token = process.env.EXPO_PUBLIC_SANITY_TOKEN;
    if (!projectId || !dataset) {
      showAlert("Export unavailable", "Sanity project settings are missing from this build.");
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress("Preparing your export…");
      const response = await fetch(`https://${projectId}.api.sanity.io/v2021-06-07/data/export/${dataset}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error(`Export failed (${response.status}).`);

      const contents = await response.text();
      const fileName = `tunisiska-backup-${new Date().toISOString().slice(0, 10)}.ndjson`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, contents);
      await shareAsync(fileUri);
      showAlert("Export ready", "The data export is ready to save or share.");
    } catch (cause: any) {
      showAlert("Export failed", cause?.message || "Could not export Sanity data. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <ScreenHeader title="Data backup" subtitle="Secure operations" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 56, gap: spacing.md }}>
        <View style={{ padding: spacing.lg, borderRadius: radii.lg, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderSubtle, ...shadows.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={{ width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft }}>
              <AppIcon name="shield-checkmark-outline" size={23} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="headline">Keep your data protected</ThemedText>
              <ThemedText variant="caption" tone="secondary" style={{ marginTop: 3 }}>Create a shareable export of your Sanity dataset.</ThemedText>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: theme.separator, marginVertical: spacing.lg }} />
          <ThemedText variant="caption" tone="secondary">Last backup</ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: spacing.xs }}>
            {/* The translated sentence is long in Swedish/Arabic, so it takes the
                available width and wraps while the badge keeps its own size. */}
            <ThemedText variant="bodySm" style={{ flex: 1, flexShrink: 1 }}>No recent backup details</ThemedText>
            <View style={{ flexShrink: 0 }}>
              <Badge label="Not recorded" tone="neutral" />
            </View>
          </View>
        </View>

        <View style={{ padding: spacing.lg, borderRadius: radii.lg, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderSubtle, ...shadows.sm }}>
          <ThemedText variant="title3">Export data</ThemedText>
          <ThemedText variant="bodySm" tone="secondary" style={{ marginTop: spacing.xs }}>
            Download the configured Sanity dataset as an NDJSON file, then save or share it from the system sheet.
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md, borderRadius: radii.md, backgroundColor: theme.surfaceAlt }}>
            <AppIcon name="document-text-outline" size={19} color={theme.primary} />
            <ThemedText variant="bodySm" style={{ flex: 1 }}>Sanity dataset · NDJSON</ThemedText>
          </View>
          {exportProgress ? <ThemedText variant="caption" tone="secondary" style={{ marginTop: spacing.md }}>{exportProgress}</ThemedText> : null}
          <PrimaryButton label="Export dataset" icon="cloud-download-outline" onPress={handleExportData} loading={isExporting} style={{ marginTop: spacing.lg }} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingHorizontal: spacing.xs }}>
          <AppIcon name="information-circle-outline" size={17} color={theme.textTertiary} />
          <ThemedText variant="caption" tone="secondary" style={{ flex: 1 }}>
            This admin tool exports data. Restore and automatic backup history are not available here.
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
