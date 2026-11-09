import React, { useState } from "react";
import { View,  TouchableOpacity, Alert } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import { useTheme } from "@/app/context/ThemeContext";
import { OtpInput } from "react-native-otp-entry";
import { AutoText } from "@/app/components/ui/AutoText";
import { showAlert } from "@/app/utils/showAlert";

export default function VerifyEmail() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { emailId } = useLocalSearchParams(); // passed from AddNewEmail
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!isLoaded || !user) return;

    try {
      setLoading(true);
      const emailAddress = user.emailAddresses.find((e) => e.id === emailId);

      if (!emailAddress) {
        showAlert("Fel", "Kunde inte hitta e-postadressen.");
        return;
      }

      await emailAddress.attemptVerification({ code });

      showAlert("Klart!", "Din nya e-postadress har verifierats.");
      router.replace("/profile");
    } catch (err: any) {
      showAlert("Fel", err.errors?.[0]?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!isLoaded || !user) return;

    try {
      const emailAddress = user.emailAddresses.find((e) => e.id === emailId);
      if (!emailAddress) return;

      await emailAddress.prepareVerification({ strategy: "email_code" });
      showAlert("Ny kod skickad", "Vi har skickat en ny kod till din e-post.");
    } catch (err: any) {
      showAlert("Fel", err.errors?.[0]?.message || err.message);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <ScreenHeader title="Verify email" subtitle="Enter the code sent to your new email address" showBack />

      {/* Content */}
      <View className="flex-1 p-6">
        {/* OTP Input */}
        <OtpInput
          numberOfDigits={6}
          onTextChange={setCode}
          focusColor={isDark ? "#6A85B4" : "#132B55"}
          theme={{
            pinCodeContainerStyle: {
              borderColor: isDark ? "#374151" : "#D1D5DB",
              backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
              borderRadius: 12,
            },
            pinCodeTextStyle: {
              fontSize: 18,
              color: isDark ? "#F9FAFB" : "#111827",
            },
          }}
        />

        {/* Verify Button */}
        <PrimaryButton label={loading ? "Verifierar..." : "Verifiera"} onPress={handleVerify} loading={loading} disabled={code.length < 6} style={{ marginTop: 24 }} />

        {/* Resend Code */}
        <TouchableOpacity onPress={handleResend} className="mt-4">
          <AutoText
            className={`font-medium ${
              isDark ? "text-blue-400" : "text-blue-500"
            }`}
          >
            Skicka om koden
          </AutoText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
