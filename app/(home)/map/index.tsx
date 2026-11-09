import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { currentDateLocale } from "@/app/lib/time";

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "confirmed") return "success";
  if (status === "in_progress") return "warning";
  return "neutral";
}

function statusLabel(status: string): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "in_progress":
      return "In progress";
    default:
      return "Unknown";
  }
}

export default function MapScreen() {
  const { resolvedTheme } = useTheme();
  const theme = useThemeColors();
  const router = useRouter();
  const [activeShipments, setActiveShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveShipments = async () => {
      try {
        // Fetch ALL active shipping orders for public map view
        const result = await ShippingOrderService.getAllActiveShippingOrders();

        if (result.success && result.orders) {
          setActiveShipments(result.orders);
        }
      } catch (error) {
        console.error("Error fetching active shipments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveShipments();

    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(fetchActiveShipments, 30000);

    return () => clearInterval(interval);
  }, []);

  const renderShipment = ({ item, index }: any) => (
    <Animated.View
      key={item._id + index}
      entering={FadeInUp.delay(120 * index)}
      style={{ marginBottom: spacing.md }}
    >
      <View
        style={{
          backgroundColor: theme.surface,
          padding: spacing.lg,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: theme.borderSubtle,
          ...shadows.sm,
        }}
      >
        {/* Header row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
          <ThemedText variant="headline">
            Shipment #{item._id?.slice(-6)}
          </ThemedText>
          <Badge label={statusLabel(item.status)} tone={statusTone(item.status)} />
        </View>

        {/* Route */}
        <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#22C55E", marginRight: spacing.md }} />
            <ThemedText variant="bodySm" style={{ flex: 1, fontWeight: "500" }} translate={false}>
              {item.pickupAddress}
            </ThemedText>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 4 }}>
            <View style={{ width: 2, height: 24, backgroundColor: theme.separator, marginRight: spacing.md, marginLeft: 3 }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.accent, marginRight: spacing.md }} />
            <ThemedText variant="bodySm" style={{ flex: 1, fontWeight: "500" }} translate={false}>
              {item.deliveryAddress}
            </ThemedText>
          </View>
        </View>

        {/* Package Details */}
        {item.packageDetails ? (
          <View style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: theme.surfaceAlt }}>
            <ThemedText variant="bodySm" style={{ fontWeight: "500" }} translate={false}>
              Package: {item.packageDetails.description || "No description"}
            </ThemedText>
            <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }} translate={false}>
              Weight: {item.packageDetails.weight}kg • Value: {item.packageDetails.value} SEK
            </ThemedText>
          </View>
        ) : null}

        {/* Driver Info */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <AppIcon name="person-circle-outline" size={24} color={theme.primary} />
            <View style={{ marginLeft: spacing.sm }}>
              <ThemedText variant="bodySm" style={{ fontWeight: "500" }} translate={false}>
                Driver: {item.driverInfo?.name || "To be assigned"}
              </ThemedText>
              <ThemedText variant="caption" tone="secondary" translate={false}>
                {item.driverInfo?.phone || "No phone yet"}
              </ThemedText>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <ThemedText variant="bodySm" style={{ fontWeight: "500" }} translate={false}>
              {item.scheduledDateTime ? new Date(item.scheduledDateTime).toLocaleDateString(currentDateLocale()) : "No date"}
            </ThemedText>
            <ThemedText variant="caption" tone="secondary" translate={false}>
              {item.scheduledDateTime ? new Date(item.scheduledDateTime).toLocaleTimeString(currentDateLocale(), { hour: "2-digit", minute: "2-digit" }) : "No time"}
            </ThemedText>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="View on map"
              icon="map-outline"
              onPress={() => {
                // Navigate to detailed map view for this shipment
                router.push(`/(home)/map/${item._id}` as any);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="Call driver"
              variant="secondary"
              icon="call-outline"
              onPress={() => {
                // Call driver
                const phoneNumber = item.driverInfo?.phone;
                if (phoneNumber) {
                  // In a real app, this would open the phone dialer
                  console.log(`Calling ${phoneNumber}`);
                } else {
                  console.log("Driver phone number is not available yet.");
                }
              }}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader
        title="Delivery map"
        subtitle="Track all active deliveries in real time"
        showBack
      />

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.sm }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText variant="bodySm" tone="secondary">
            Loading deliveries...
          </ThemedText>
        </View>
      ) : activeShipments.length === 0 ? (
        <View style={{ flex: 1, paddingHorizontal: spacing.gutter, justifyContent: "center" }}>
          <EmptyState
            icon="map-outline"
            title="No active deliveries"
            description="Active deliveries will appear here in real time"
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: 100 }}
        >
          {activeShipments.map((shipment, index) =>
            renderShipment({ item: shipment, index })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
