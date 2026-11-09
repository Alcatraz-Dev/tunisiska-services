import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";

import AppIcon from "@/app/components/ui/AppIcon";
import Badge from "@/app/components/ui/Badge";
import EmptyState from "@/app/components/ui/EmptyState";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, shadows, spacing } from "@/app/theme/spacing";
import { ShippingOrderService } from "@/app/services/shippingOrderService";
import { showAlert } from "@/app/utils/showAlert";
import { currentDateLocale, zonedDateLabel, zonedTime } from "@/app/lib/time";
import { getRoute } from "@/app/lib/routes";
import {
  coordinatesForCity,
  formatDistanceKm,
  formatDuration,
  getRouteMetrics,
  interpolatePath,
} from "@/app/lib/routeMetrics";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";

function statusTone(status: string): "success" | "warning" | "info" | "neutral" {
  if (status === "confirmed") return "info";
  if (status === "in_progress") return "warning";
  if (status === "completed") return "success";
  return "neutral";
}

function MapPin({
  glyph,
  tint,
  accessibilityLabel,
}: {
  glyph: string;
  tint: string;
  accessibilityLabel: string;
}) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={{ alignItems: "center" }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${tint}22`,
          shadowColor: tint,
          shadowOpacity: 0.45,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 7 },
          elevation: 9,
        }}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.95)", tint]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.85)",
          }}
        >
          <ThemedText style={{ fontSize: 17, lineHeight: 21 }} translate={false}>
            {glyph}
          </ThemedText>
        </LinearGradient>
      </View>
      <View style={{ width: 4, height: 8, marginTop: -3, borderRadius: 2, backgroundColor: tint }} />
      <View
        style={{
          width: 12,
          height: 4,
          marginTop: 1,
          borderRadius: 2,
          backgroundColor: "rgba(0,0,0,0.22)",
        }}
      />
    </View>
  );
}

export default function ShipmentMapScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const theme = useThemeColors();
  const router = useRouter();
  const { slug } = useLocalSearchParams();
  const { language } = useLanguage();
  const locale = currentDateLocale(language);
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const distanceLabel = useTranslationText("Distance", language);
  const durationLabel = useTranslationText("Duration", language);
  const departureLabel = useTranslationText("Departure", language);
  const pickupLabel = useTranslationText("Collection", language);
  const deliveryLabel = useTranslationText("Delivery", language);

  // Handle slug parameter
  const shipmentId = Array.isArray(slug) ? slug[0] : slug;

  useEffect(() => {
    const fetchShipment = async () => {
      if (!shipmentId) {
        setLoading(false);
        return;
      }

      try {
        const result = await ShippingOrderService.getShippingOrder(shipmentId);
        if (result.success && result.order) setShipment(result.order);
      } catch (error) {
        console.error("Error fetching shipment:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShipment();
  }, [shipmentId]);

  /**
   * The shipment's own route drives the map. Coordinates come from the served
   * cities; nothing is drawn when the route cannot be resolved, so the screen
   * never falls back to a placeholder line.
   */
  const geometry = useMemo(() => {
    if (!shipment) return null;

    const route = getRoute(shipment.route);
    const from =
      coordinatesForCity(route.origin) ?? coordinatesForCity(shipment.pickupAddress);
    const to =
      coordinatesForCity(route.destination) ??
      coordinatesForCity(shipment.deliveryAddress);

    if (!from || !to) return null;

    return {
      route,
      from,
      to,
      path: interpolatePath(from, to),
      metrics: getRouteMetrics(shipment.route, shipment.vehicle),
    };
  }, [shipment]);

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmed";
      case "in_progress":
        return "In progress";
      case "completed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ScreenHeader title="Map view" showBack />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText variant="bodySm" tone="secondary">
            Loading map data...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!shipment) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ScreenHeader title="Map view" showBack />
        <View style={{ flex: 1, paddingHorizontal: spacing.gutter, justifyContent: "center" }}>
          <EmptyState
            icon="map-outline"
            title="Delivery not found"
            description="This shipment could not be loaded"
          />
        </View>
      </SafeAreaView>
    );
  }

  const distance = formatDistanceKm(geometry?.metrics.distanceKm ?? null, locale);
  const duration = formatDuration(geometry?.metrics.durationHours ?? null);
  const timezone = (geometry?.route.timezone ?? "Europe/Stockholm") as
    | "Europe/Stockholm"
    | "Africa/Tunis";

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScreenHeader
        title={`Map view — Shipment #${shipment._id?.slice(-6)}`}
        subtitle="Track your delivery in real time"
        showBack
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 48, gap: spacing.md }}
      >
        {/* Real route between the shipment's two cities */}
        <View
          style={{
            height: 300,
            borderRadius: radii.lg,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.borderSubtle,
            overflow: "hidden",
            ...shadows.sm,
          }}
        >
          {geometry ? (
            <MapView
              style={{ flex: 1 }}
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
              initialRegion={{
                latitude: (geometry.from.latitude + geometry.to.latitude) / 2,
                longitude: (geometry.from.longitude + geometry.to.longitude) / 2,
                latitudeDelta: Math.abs(geometry.from.latitude - geometry.to.latitude) * 1.5 || 1,
                longitudeDelta: Math.abs(geometry.from.longitude - geometry.to.longitude) * 1.5 || 1,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Polyline
                coordinates={geometry.path}
                strokeColor={isDark ? "#F2761B" : "#E0620C"}
                strokeWidth={4}
                lineJoin="round"
                lineCap="round"
                geodesic
              />
              <Marker coordinate={geometry.from} anchor={{ x: 0.5, y: 1 }}>
                <MapPin
                  glyph="📦"
                  tint="#22C55E"
                  accessibilityLabel={`${pickupLabel}: ${geometry.route.origin}`}
                />
              </Marker>
              <Marker coordinate={geometry.to} anchor={{ x: 0.5, y: 1 }}>
                <MapPin
                  glyph="🎯"
                  tint={theme.accent}
                  accessibilityLabel={`${deliveryLabel}: ${geometry.route.destination}`}
                />
              </Marker>
            </MapView>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.sm }}>
              <AppIcon name="map-outline" size={36} color={theme.textQuaternary} />
              <ThemedText variant="bodySm" tone="secondary" align="center">
                This delivery's route could not be located on the map.
              </ThemedText>
            </View>
          )}
        </View>

        {/* Shipment Details */}
        <Animated.View
          entering={FadeInUp.duration(600)}
          style={{
            padding: spacing.lg,
            borderRadius: radii.lg,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.borderSubtle,
            ...shadows.sm,
          }}
        >
          {/* Status */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
            <ThemedText variant="headline" translate={false}>
              Status: {getStatusText(shipment.status)}
            </ThemedText>
            <Badge label={getStatusText(shipment.status)} tone={statusTone(shipment.status)} />
          </View>

          {/* Route */}
          <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#22C55E", marginRight: spacing.md }} />
              <ThemedText variant="bodySm" style={{ flex: 1, fontWeight: "500" }} translate={false}>
                From: {shipment.pickupAddress}
              </ThemedText>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 4 }}>
              <View style={{ width: 2, height: 24, backgroundColor: theme.separator, marginRight: spacing.md, marginLeft: 3 }} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent, marginRight: spacing.md }} />
              <ThemedText variant="bodySm" style={{ flex: 1, fontWeight: "500" }} translate={false}>
                To: {shipment.deliveryAddress}
              </ThemedText>
            </View>
          </View>

          {/* Route metrics, from the shipment's own schedule */}
          <View
            style={{
              marginBottom: spacing.md,
              padding: spacing.md,
              borderRadius: radii.md,
              backgroundColor: theme.primarySoft,
              flexDirection: "row",
              gap: spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <ThemedText variant="footnote" tone="tertiary">
                {distanceLabel}
              </ThemedText>
              <ThemedText variant="headline" translate={false}>
                {distance ?? "—"}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="footnote" tone="tertiary">
                {durationLabel}
              </ThemedText>
              <ThemedText variant="headline" translate={false}>
                {duration ?? "—"}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText variant="footnote" tone="tertiary">
                {departureLabel}
              </ThemedText>
              <ThemedText variant="headline" translate={false} numberOfLines={1}>
                {shipment.scheduledDateTime
                  ? `${zonedDateLabel(new Date(shipment.scheduledDateTime), timezone, locale)} ${zonedTime(
                      new Date(shipment.scheduledDateTime),
                      timezone,
                    )}`
                  : "—"}
              </ThemedText>
            </View>
          </View>

          {/* Driver */}
          <View
            style={{
              marginBottom: spacing.md,
              padding: spacing.md,
              borderRadius: radii.md,
              backgroundColor: theme.surfaceAlt,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            <AppIcon name="person-circle-outline" size={22} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="bodySm" style={{ fontWeight: "500" }} translate={false}>
                {shipment.driverInfo?.name || "Driver to be assigned"}
              </ThemedText>
              <ThemedText variant="caption" tone="secondary" translate={false}>
                {shipment.driverInfo?.phone || "No phone yet"}
              </ThemedText>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Call driver"
                icon="call-outline"
                onPress={() => {
                  const phoneNumber = shipment.driverInfo?.phone;
                  if (phoneNumber) {
                    void showAlert("Call driver", `Call ${phoneNumber}?`, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Call",
                        onPress: () => {
                          console.log(`Calling ${phoneNumber}`);
                        },
                      },
                    ]);
                  } else {
                    void showAlert("Info", "The driver's phone number is not available yet.");
                  }
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Support"
                variant="secondary"
                icon="help-circle-outline"
                onPress={() => {
                  void showAlert("Support", "Contact support for help with your delivery.");
                }}
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
