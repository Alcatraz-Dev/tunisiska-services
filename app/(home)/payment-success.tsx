import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { AutoText } from "@/app/components/ui/AutoText";

export default function PaymentSuccessScreen() {
  const router = useRouter();

  useEffect(() => {
    // This screen is just a landing spot for the deep link or redirect.
    // The WebView in PaymentStripeJS.tsx will likely intercept the URL before 
    // the user even sees this, but having the screen prevents "Not Found" error.
    console.log("Payment success screen mounted");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <AutoText style={{ color: "#fff", marginTop: 20 }}>Betalning bekräftad, bearbetar...</AutoText>
    </View>
  );
}
