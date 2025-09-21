import React from "react";
import { Alert, TouchableOpacity, Text, Image, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import images from "../constants/images";
import { useTheme } from "../context/ThemeContext";
import { AutoText } from "./ui/AutoText";
import { showAlert } from "../utils/showAlert";

interface SwishPayProps {
  orderId: string;
  amount: number;
  number: string;
  lineItems?: any[];
  disabled?: boolean;
  className?: string;
  textClassName?: string;
}

export function SwishPay({
  orderId,
  amount,
  number,
  lineItems,
  disabled,
  className = "",
  textClassName = "",
}: SwishPayProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const createSwishLink = () => {
    const paymentRef = `ORDER-${orderId}`;
    const params = new URLSearchParams({
      sw: number,
      amt: Math.max(1, amount).toFixed(2),
      cur: "SEK",
      msg: encodeURIComponent(paymentRef),
      src: "app",
    });
    return `https://app.swish.nu/1/p/sw/?${params.toString()}`;
  };

  const handlePayment = async () => {
    try {
      const swishLink = createSwishLink();
      const supported = await Linking.canOpenURL(swishLink);
      if (supported) {
        await Linking.openURL(swishLink);
        showAlert("Swish", "Betalning påbörjad i Swish.");
      } else {
        showAlert("Fel", "Kunde inte öppna Swish.");
      }
    } catch (error) {
      console.error("Swish payment error:", error);
      showAlert("Fel", "Betalningsinitiering misslyckades");
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePayment}
      disabled={disabled || amount <= 0}
      className={`flex-1 gap-1 p-1.5 my-2 rounded-xl items-center shadow-md ${
        isDark ? "bg-dark-card" : "bg-light-card"
      } ${className}`}
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
      }}
    >
      <View className="flex-1 w-full items-center justify-center">
        <Image
          source={images.swish}
          className="w-6 h-6 my-1"
          style={{ resizeMode: "contain" }}
        />
        <AutoText
          className={`text-xs font-bold text-center mt-1 ${textClassName}`}
          style={{
            color: disabled
              ? "#9ca3af" // gray for disabled
              : isDark
              ? "#fff" // white in dark mode
              : "#111827", // dark text in light mode
          }}
        >
          {lineItems?.[0]?.name || "Köp poäng"}
        </AutoText>
        <AutoText
          className="text-[10px] mt-1 text-center"
          style={{
            color: disabled
              ? "#d1d5db" // lighter gray for disabled
              : isDark
              ? "#fff"
              : "#111827",
          }}
        >
          {amount} kr
        </AutoText>
      </View>
    </TouchableOpacity>
  );
}
