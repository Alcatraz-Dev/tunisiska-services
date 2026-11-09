import React from "react";
import { ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedText from "@/app/components/ui/ThemedText";
import PressableScale from "@/app/components/ui/PressableScale";
import { useTheme } from "@/app/context/ThemeContext";

export default function TrackShipmentScreen() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: "#F7F9FC" }}
    >
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />

      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <PressableScale
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
          haptic="light"
        >
          <AppIcon name="chevron-back" size={22} color="#0C1626" />
        </PressableScale>
        <ThemedText style={{ flex: 1, fontSize: 20, fontWeight: "700", color: "#0C1626", marginLeft: 4 }}>Track Your Shipment</ThemedText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <View style={{ marginTop: 12, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E4E9F0", padding: 16 }}>
          <ThemedText style={{ fontSize: 15, fontWeight: "600", color: "#0C1626", marginBottom: 16 }}>Order Status</ThemedText>
          <View style={{ gap: 20 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#132B55" }} />
                <View style={{ width: 2, height: 40, backgroundColor: "#E4E9F0", marginTop: 4 }} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 14, fontWeight: "600", color: "#0C1626" }}>Order Placed</ThemedText>
                <ThemedText style={{ fontSize: 12, color: "#55627A", marginTop: 2 }}>Confirmed</ThemedText>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#E4E9F0" }} />
                <View style={{ width: 2, height: 40, backgroundColor: "#E4E9F0", marginTop: 4 }} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 14, fontWeight: "500", color: "#8A97AC" }}>In Transit</ThemedText>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ alignItems: "center" }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#E4E9F0" }} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ fontSize: 14, fontWeight: "500", color: "#8A97AC" }}>Delivered</ThemedText>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
