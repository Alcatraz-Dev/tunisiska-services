import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { client } from "@/sanityClient";
import AppIcon from "@/app/components/ui/AppIcon";
import EmptyState from "@/app/components/ui/EmptyState";
import Input from "@/app/components/ui/Input";
import PressableScale from "@/app/components/ui/PressableScale";
import ThemedText from "@/app/components/ui/ThemedText";
import Badge from "@/app/components/ui/Badge";
import Skeleton from "@/app/components/ui/Skeleton";
import { useThemeColors } from "@/app/theme";
import { spacing, radii, shadows } from "@/app/theme/spacing";
import { currentDateLocale } from "@/app/lib/time";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";

const EMPTY_PARAMS: Record<string, any> = {};

interface Column {
  key: string;
  label: string;
  type?: "text" | "date" | "status" | "currency" | "image";
}

interface AdminDataListProps {
  title: string;
  query: string;
  params?: Record<string, any>;
  columns: Column[];
  onItemPress?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  searchField?: string;
  refreshKey?: number;
}

function statusTone(value: unknown): "success" | "warning" | "danger" | "info" | "neutral" {
  const status = String(value ?? "").toLowerCase();
  if (["true", "confirmed", "completed", "active", "accepted", "published"].includes(status)) return "success";
  if (["pending", "draft"].includes(status)) return "warning";
  if (["false", "cancelled", "rejected", "deleted"].includes(status)) return "danger";
  if (["in transit", "in_transit", "departed"].includes(status)) return "info";
  return "neutral";
}

function formatValue(value: any, type?: Column["type"]): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "date") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(currentDateLocale(), { day: "numeric", month: "short", year: "numeric" });
  }
  if (type === "currency") return `${Number(value || 0).toLocaleString(currentDateLocale())} SEK`;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === "object") return value.email || value.userName || value.name || value.title || value.label || "Record";
  return String(value);
}

export function AdminDataList({
  title,
  query,
  params = EMPTY_PARAMS,
  columns,
  onItemPress,
  onEdit,
  onDelete,
  searchField,
  refreshKey = 0,
}: AdminDataListProps) {
  const theme = useThemeColors();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();
  const openWord = useTranslationText("Open", language);
  const deleteWord = useTranslationText("Delete", language);
  const clearSearchLabel = useTranslationText("Clear search", language);
  const searchPlaceholder = useTranslationText(searchPlaceholderForTitle(title), language);
  function searchPlaceholderForTitle(listTitle: string) {
    const key = listTitle.trim().toLowerCase();
    if (key.includes("user")) return "Search users";
    if (key.includes("shipping order")) return "Search shipping orders";
    if (key.includes("taxi")) return "Search taxi bookings";
    if (key.includes("announcement")) return "Search announcements";
    return `Search ${key}`;
  }
  function emptyTitleForTitle(listTitle: string, searching: boolean) {
    if (searching) return "No matching records";
    const key = listTitle.trim().toLowerCase();
    if (key.includes("user")) return "No users yet";
    if (key.includes("shipping order")) return "No shipping orders yet";
    if (key.includes("taxi")) return "No taxi bookings yet";
    if (key.includes("announcement")) return "No announcements yet";
    return `No ${key} yet`;
  }

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await client.fetch(query, params);
      setData(Array.isArray(result) ? result : []);
    } catch (cause: any) {
      setError(cause?.message || "Could not load records. Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, params]);

  useEffect(() => { void fetchData(); }, [fetchData, refreshKey]);

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    if (!term || !searchField) return data;
    return data.filter((item) => String(item?.[searchField] ?? "").toLocaleLowerCase().includes(term));
  }, [data, searchTerm, searchField]);
  const countUnit = useTranslationText(filteredData.length === 1 ? "record" : "records", language);
  const emptyTitleText = useTranslationText(emptyTitleForTitle(title, Boolean(searchTerm)), language);

  const firstColumn = columns[0];
  const remainingColumns = columns.slice(1, 4);

  const renderItem = ({ item }: { item: any }) => {
    const titleValue = formatValue(item?.[firstColumn?.key], firstColumn?.type);
    const recordTitle = titleValue === "—"
      ? String(item?.email || item?.userName || item?.name || item?.title || item?.clerkId || item?._id || "Record")
      : titleValue;
    const metadata = remainingColumns.filter((column) => item?.[column.key] !== undefined && item?.[column.key] !== null);

    return (
      <PressableScale
        onPress={() => (onItemPress ?? onEdit)?.(item)}
        accessibilityRole="button"
        accessibilityLabel={`${openWord || "Open"} ${recordTitle}`}
        haptic="light"
        pressedScale={0.99}
        style={{ marginBottom: spacing.sm }}
      >
        <View style={{ minHeight: 78, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.borderSubtle, backgroundColor: theme.surface, ...shadows.sm }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <AppIcon name={firstColumn?.key === "email" ? "person-outline" : firstColumn?.key.toLowerCase().includes("date") ? "calendar-outline" : "document-text-outline"} size={19} color={theme.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <ThemedText variant="headline" numberOfLines={1} translate={firstColumn?.key !== "email"}>{recordTitle}</ThemedText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: spacing.sm, rowGap: 4 }}>
              {metadata.map((column) => {
                const value = item?.[column.key];
                if (column.type === "status") return <Badge key={column.key} label={formatValue(value)} tone={statusTone(value)} />;
                return (
                  <ThemedText key={column.key} variant="caption" tone="secondary" numberOfLines={1} translate={column.type !== "date" && column.type !== "currency" && column.key !== "email" && column.key !== "phone"}>
                    {formatValue(value, column.type)}
                  </ThemedText>
                );
              })}
            </View>
          </View>
          {onDelete ? (
            <PressableScale onPress={() => onDelete(item)} accessibilityRole="button" accessibilityLabel={`${deleteWord || "Delete"} ${recordTitle}`} haptic="light" style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <AppIcon name="trash-outline" size={18} color={theme.textTertiary} />
            </PressableScale>
          ) : <AppIcon name="chevron-forward" size={17} color={theme.textQuaternary} />}
        </View>
      </PressableScale>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: spacing.gutter, paddingBottom: spacing.md }}>
        {searchField ? (
          <View style={{ minHeight: 50, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
            <AppIcon name="search-outline" size={18} color={theme.textTertiary} />
            <Input placeholder={searchPlaceholder || `Search ${title.toLowerCase()}`} value={searchTerm} onChangeText={setSearchTerm} style={{ flex: 1, marginLeft: spacing.sm, fontSize: 14, color: theme.textPrimary }} />
            {searchTerm ? <PressableScale onPress={() => setSearchTerm("")} accessibilityRole="button" accessibilityLabel={clearSearchLabel || "Clear search"} haptic="selection"><AppIcon name="close-circle" size={18} color={theme.textTertiary} /></PressableScale> : null}
          </View>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md }}>
          <ThemedText variant="caption" tone="secondary" translate={false}>{loading ? "Loading records" : `${filteredData.length} ${countUnit || (filteredData.length === 1 ? "record" : "records")}`}</ThemedText>
          {searchTerm ? <ThemedText variant="caption" tone="tertiary">Filtered</ThemedText> : null}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={{ paddingHorizontal: spacing.gutter, gap: spacing.sm }}>
          {[0, 1, 2, 3].map((key) => <Skeleton key={key} height={78} radius={radii.lg} />)}
        </View>
      ) : error ? (
        <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.xxxl, alignItems: "center", gap: spacing.md }}>
          <AppIcon name="cloud-offline-outline" size={32} color={theme.textTertiary} />
          <ThemedText variant="title3">Records could not load</ThemedText>
          <ThemedText variant="bodySm" tone="secondary" align="center">{error}</ThemedText>
          <PressableScale onPress={() => void fetchData()} accessibilityRole="button" haptic="light" style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: theme.primary }}>
            <ThemedText variant="button" style={{ color: theme.textOnAccent }}>Try again</ThemedText>
          </PressableScale>
        </View>
      ) : filteredData.length === 0 ? (
        <View style={{ flex: 1, paddingHorizontal: spacing.gutter, justifyContent: "center" }}>
          <EmptyState icon="folder-open-outline" title={emptyTitleText} description={searchTerm ? "Try another name or search term." : "New records will appear here when they are added."} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => String(item?._id || item?.id || `${title}-${index}`)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void fetchData(true)} tintColor={theme.primary} />}
        />
      )}
    </View>
  );
}
