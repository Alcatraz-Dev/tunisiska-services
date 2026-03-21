import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { AutoText } from "@/app/components/ui/AutoText";

export default function PaymentCancelScreen() {
  const router = useRouter();

  useEffect(() => {
    console.log("Payment cancel screen mounted");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
      <ActivityIndicator size="large" color="#ef4444" />
      <AutoText style={{ color: "#fff", marginTop: 20 }}>Betalning avbröts, återgår...</AutoText>
    </View>
  );
}
