import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import UserEmails from "@/app/components/UserEmails";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { showAlert } from "@/app/utils/showAlert";

export default function AddNewEmail() {
  const { language } = useLanguage();
  const emailHint = useTranslationText("Ange ny e-postadress", language);
  const { user, isLoaded } = useUser();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

const handleAddEmail = async () => {
  if (!isLoaded || !user) {
    showAlert("Fel", "Användaren är inte laddad ännu.");
    return;
  }

  if (!newEmail.includes("@")) {
    showAlert("Fel", "Ange en giltig e-postadress.");
    return;
  }

  try {
    setLoading(true);
    const email = await user.createEmailAddress({ email: newEmail });

    // Send code to this email
    await email.prepareVerification({ strategy: "email_code" });

    setNewEmail("");

    // Navigate to verification screen and pass email.id
    router.push({
      pathname: "/profile/personal-information/add-new-email/verify-email",
      params: { emailId: email.id },
    });
  } catch (err: any) {
    showAlert("Fel", err.errors?.[0]?.message || err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <ScreenHeader title="Add email" subtitle="Add a new email address to your account" showBack />

      <ScrollView className="flex-1 p-6">
        {/* New Email */}
        <View className="mb-5">
          <UserEmails/>
          <AutoText
            className={`text-sm font-medium my-2 ${
              isDark ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Nytt Email
          </AutoText>
          <View className="relative">
            <Input
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder={emailHint}
              placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
              keyboardType="email-address"
              autoCapitalize="none"
              className={`border rounded-xl p-4 pr-12 ${
                isDark
                  ? "border-gray-700 bg-dark-card text-white"
                  : "border-gray-300 bg-light-card text-black"
              }`}
            />
          </View>
        </View>

        {/* add new email Button */}
        <PrimaryButton label={loading ? "Lägger till..." : "Lägg till E-post"} onPress={handleAddEmail} loading={loading} style={{ marginBottom: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
