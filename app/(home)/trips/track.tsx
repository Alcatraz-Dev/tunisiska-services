import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useUser } from "@clerk/clerk-expo";

import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import EmptyState from "@/app/components/ui/EmptyState";
import Badge from "@/app/components/ui/Badge";
import Skeleton from "@/app/components/ui/Skeleton";
import { useThemeColors } from "@/app/theme";
import { useTheme } from "@/app/context/ThemeContext";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { stagger } from "@/app/theme/motion";
import {
  SHIPMENT_STAGES,
  getMyShipments,
  getShipmentByTrackingNumber,
  shipmentRoute,
  stageIndexFor,
  statusLabel,
  type Shipment,
} from "@/app/services/shipmentService";
import { zonedFullDateLabel } from "@/app/lib/time";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";

/**
 * Track a shipment.
 *
 * The stage tracker is driven entirely by the order's real `status` field in
 * Sanity. The progress ring shows the same information numerically, so the
 * state is never implied by the visual alone.
 */
export default function TrackShipmentScreen() {
  const styles = createStyles();
  const theme = useThemeColors();
  const { language } = useLanguage();
  const trackingPlaceholder = useTranslationText("Enter tracking number (e.g. TMT-2411504)", language);
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ tracking?: string; id?: string }>();
  const { user, isLoaded } = useUser();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(params.tracking || params.id || "");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = useCallback(async (codeToSearch?: string) => {
    const code = (codeToSearch ?? searchQuery).trim();
    if (!code) return;
    setSearching(true);
    setSearchError(null);
    try {
      const found = await getShipmentByTrackingNumber(code);
      if (found) {
        setShipments((prev) => {
          if (prev.some((s) => s.id === found.id)) return prev;
          return [found, ...prev];
        });
        setSelectedId(found.id);
      } else {
        setSearchError("No shipment found with this tracking number");
      }
    } catch {
      setSearchError("Failed to lookup tracking number");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getMyShipments(user.id);
    setShipments(result);
    setSelectedId((current) => current ?? result[0]?.id ?? null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (isLoaded) load();
  }, [isLoaded, load]);

  useEffect(() => {
    if (params.tracking || params.id) {
      handleSearch(params.tracking || params.id);
    }
  }, [params.tracking, params.id, handleSearch]);

  const selected = useMemo(
    () => shipments.find((s) => s.id === selectedId) ?? shipments[0] ?? null,
    [shipments, selectedId],
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <View style={styles.header}>
        <PressableScale
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          accessibilityRole="button"
          accessibilityLabel="Back"
          haptic="light"
          style={{ marginLeft: -spacing.md }}
        >
          <AppIcon name="chevron-back" size={26} color={theme.textPrimary} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <ThemedText variant="title2">Track your shipment</ThemedText>
        </View>
      </View>

      {/* ── Tracking Number Search ────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: spacing.gutter,
          paddingBottom: spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.surface,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: searchError ? theme.borderStrong : theme.border,
            paddingHorizontal: spacing.md,
            height: 44,
            ...shadows.sm,
          }}
        >
          <AppIcon name="search-outline" size={18} color={theme.textTertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (searchError) setSearchError(null);
            }}
            placeholder={trackingPlaceholder}
            placeholderTextColor={theme.textTertiary}
            accessibilityLabel={trackingPlaceholder}
            returnKeyType="search"
            autoCapitalize="characters"
            onSubmitEditing={() => handleSearch()}
            style={{
              flex: 1,
              marginLeft: spacing.sm,
              color: theme.textPrimary,
              fontSize: 13.5,
            }}
          />
          {searchQuery ? (
            <PressableScale
              onPress={() => {
                setSearchQuery("");
                setSearchError(null);
              }}
              accessibilityLabel="Clear search"
              haptic="light"
            >
              <AppIcon
                name="close-circle"
                size={18}
                color={theme.textTertiary}
              />
            </PressableScale>
          ) : null}
        </View>
        {searchError ? (
          <ThemedText
            variant="footnote"
            tone="accent"
            style={{ marginTop: 4, marginLeft: 8 }}
          >
            {searchError}
          </ThemedText>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton width={190} height={190} radius={95} />
            <Skeleton width={160} height={16} radius={8} />
          </View>
        ) : shipments.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title="No shipments yet"
            description="Your booked shipments will appear here, with live status from our team."
            action={
              <PressableScale
                onPress={() => router.push("/(home)/services/shipping")}
                accessibilityRole="button"
                accessibilityLabel="Book a shipment"
                haptic="light"
              >
                <ThemedText variant="body" tone="accent">
                  Book a shipment
                </ThemedText>
              </PressableScale>
            }
          />
        ) : (
          <>
            {/* ── Ring ────────────────────────────────────────────── */}
            {selected ? (
              <Animated.View entering={FadeIn.duration(340)} style={styles.ringWrap}>
                <ProgressRing
                  stageIndex={stageIndexFor(selected.status)}
                  cancelled={selected.status === "cancelled"}
                />
                <View style={styles.ringLabel}>
                  <AppIcon
                    name="cube"
                    size={30}
                    color={theme.accent}
                  />
                </View>
                <View style={styles.ringCaption}>
                  <ThemedText variant="title2">
                    {statusLabel(selected.status)}
                  </ThemedText>
                  <ThemedText variant="bodySm" tone="secondary" align="center">
                    {selected.scheduledDateTime
                      ? `Scheduled ${zonedFullDateLabel(
                          new Date(selected.scheduledDateTime),
                          "Europe/Stockholm",
                        )}`
                      : "No schedule recorded yet"}
                  </ThemedText>
                </View>
              </Animated.View>
            ) : null}

            {/* ── Stages ──────────────────────────────────────────── */}
            {selected ? (
              <Animated.View
                entering={FadeInDown.delay(stagger.step).duration(340)}
                style={styles.section}
              >
                <View
                  style={[
                    styles.stageCard,
                    { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
                    shadows.sm,
                  ]}
                >
                  {SHIPMENT_STAGES.map((stage, index) => {
                    const currentIndex = stageIndexFor(selected.status);
                    const done = currentIndex >= index && currentIndex !== -1;
                    const active = currentIndex === index;

                    return (
                      <View key={stage.key} style={styles.stageRow}>
                        <View style={styles.stageRail}>
                          <View
                            style={[
                              styles.stageDot,
                              {
                                backgroundColor: done ? theme.accent : theme.surface,
                                borderColor: done ? theme.accent : theme.border,
                              },
                            ]}
                          >
                            {done ? (
                              <AppIcon
                                name={active ? "cube" : "checkmark"}
                                size={12}
                                color="#FFFFFF"
                              />
                            ) : null}
                          </View>
                          {index < SHIPMENT_STAGES.length - 1 ? (
                            <View
                              style={[
                                styles.stageLine,
                                {
                                  backgroundColor:
                                    currentIndex > index ? theme.accent : theme.border,
                                },
                              ]}
                            />
                          ) : null}
                        </View>

                        <View style={styles.stageBody}>
                          <ThemedText
                            variant="body"
                            style={{
                              color: done ? theme.textPrimary : theme.textTertiary,
                              fontWeight: active ? "700" : "500",
                            }}
                          >
                            {stage.label}
                          </ThemedText>
                        </View>
                      </View>
                    );
                  })}

                  {selected.status === "cancelled" ? (
                    <View style={{ marginTop: spacing.md }}>
                      <Badge label="Cancelled" tone="danger" icon="close-circle-outline" />
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            ) : null}

            {/* ── Shipment details ────────────────────────────────── */}
            {selected ? (
              <Animated.View
                entering={FadeInDown.delay(stagger.step * 2).duration(340)}
                style={styles.section}
              >
                <View
                  style={[
                    styles.stageCard,
                    { backgroundColor: theme.surface, borderColor: theme.borderSubtle },
                    shadows.sm,
                  ]}
                >
                  <DetailRow
                    icon="navigate-outline"
                    label="Route"
                    value={shipmentRoute(selected).directionLabel}
                  />
                  <DetailRow
                    icon="location-outline"
                    label="Pickup"
                    value={selected.pickupAddress ?? "—"}
                  />
                  <DetailRow
                    icon="flag-outline"
                    label="Delivery"
                    value={selected.deliveryAddress ?? "—"}
                  />
                  {selected.trackingNumber ? (
                    <DetailRow
                      icon="pricetag-outline"
                      label="Tracking"
                      value={selected.trackingNumber}
                    />
                  ) : null}
                  {selected.packageDescription ? (
                    <DetailRow
                      icon="cube-outline"
                      label="Contents"
                      value={selected.packageDescription}
                    />
                  ) : null}
                </View>
              </Animated.View>
            ) : null}

            {/* ── All shipments ───────────────────────────────────── */}
            {shipments.length > 1 ? (
              <Animated.View
                entering={FadeInDown.delay(stagger.step * 3).duration(340)}
                style={styles.section}
              >
                <ThemedText variant="title3" style={{ marginBottom: spacing.md }}>
                  All shipments
                </ThemedText>
                <View style={{ gap: spacing.sm }}>
                  {shipments.map((shipment) => {
                    const active = shipment.id === selected?.id;
                    return (
                      <PressableScale
                        key={shipment.id}
                        onPress={() => setSelectedId(shipment.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`Shipment ${shipmentRoute(shipment).directionLabel}, ${statusLabel(shipment.status)}`}
                        haptic="selection"
                        pressedScale={0.98}
                        style={[
                          styles.shipmentRow,
                          {
                            backgroundColor: active
                              ? theme.primarySoft
                              : theme.surface,
                            borderColor: active ? theme.primaryBorder : theme.borderSubtle,
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText variant="body" numberOfLines={1}>
                            {shipmentRoute(shipment).directionLabel}
                          </ThemedText>
                          <ThemedText variant="footnote" tone="tertiary" numberOfLines={1}>
                            {shipment.pickupAddress ?? "—"} →{" "}
                            {shipment.deliveryAddress ?? "—"}
                          </ThemedText>
                        </View>
                        <Badge
                          label={statusLabel(shipment.status)}
                          tone={
                            shipment.status === "cancelled"
                              ? "danger"
                              : shipment.status === "completed"
                                ? "success"
                                : "info"
                          }
                        />
                      </PressableScale>
                    );
                  })}
                </View>
              </Animated.View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Circular progress ring.
 *
 * The arc length equals the number of completed stages, so the ring is an
 * exact representation of the same information the stage list gives.
 */
function ProgressRing({
  stageIndex,
  cancelled,
}: {
  stageIndex: number;
  cancelled: boolean;
}) {
  const theme = useThemeColors();
  const size = 190;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = cancelled ? 0 : (stageIndex + 1) / SHIPMENT_STAGES.length;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={theme.accent} />
          <Stop offset="1" stopColor={theme.accentPressed} />
        </LinearGradient>
      </Defs>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={theme.surfaceSunken}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={cancelled ? theme.border : "url(#ring)"}
        strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;}) {
  const styles = createStyles();
  const theme = useThemeColors();

  return (
    <View style={styles.detailRow}>
      <AppIcon name={icon} size={17} color={theme.textTertiary} />
      <ThemedText variant="caption" tone="secondary" style={styles.detailLabel}>
        {label}
      </ThemedText>
      <ThemedText variant="bodySm" style={{ flex: 1 }} numberOfLines={2}>
        {value}
      </ThemedText>
    </View>
  );
}

/**
 * Built on first render, not at module scope: Expo Router 58 evaluates route
 * modules through an async registry on the server, so imported token modules can
 * still be empty while the module body runs. Reading `spacing`/`radii` eagerly
 * throws during static rendering.
 */
const createStyles = () => ({
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  loadingWrap: {
    alignItems: "center" as const,
    paddingVertical: spacing.huge,
    gap: spacing.lg,
  },
  loadingRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  loadingLine: {
    height: 16,
    width: 160,
    borderRadius: 8,
  },
  ringWrap: {
    alignItems: "center" as const,
    paddingVertical: spacing.xl,
  },
  ringLabel: {
    position: "absolute" as const,
    top: spacing.xl + 62,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ringCaption: {
    alignItems: "center" as const,
    marginTop: spacing.lg,
    gap: 2,
  },
  section: {
    paddingHorizontal: spacing.gutter,
    marginTop: spacing.lg,
  },
  stageCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  stageRow: {
    flexDirection: "row" as const,
  },
  stageRail: {
    width: 24,
    alignItems: "center" as const,
  },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  stageLine: {
    flex: 1,
    width: 2,
    marginVertical: 3,
  },
  stageBody: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 7,
  },
  detailLabel: {
    width: 84,
    marginLeft: spacing.sm,
  },
  shipmentRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
});
