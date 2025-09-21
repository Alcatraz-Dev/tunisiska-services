import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import UserEmails from "@/app/components/UserEmails";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";

export default function AddNewEmail() {
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
      {/* Header */}
      <View className={`pb-4 px-6 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className="flex-row items-center justify-center mb-4 mt-5 relative">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-0 p-2"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDark ? "#fff" : "#000"}
            />
          </TouchableOpacity>
          <AutoText
            className={`text-xl font-extrabold text-center tracking-tighter ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Ny e-post
          </AutoText>
        </View>

        <AutoText
          className={`text-sm text-center my-4 ${
            isDark ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Här kan du lägga till en ny e-postadress.
        </AutoText>
      </View>

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
              placeholder="Ange ny e-postadress"
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
        <TouchableOpacity
          onPress={handleAddEmail}
          activeOpacity={0.7}
          disabled={loading}
          className={`bg-blue-500 p-4 rounded-xl items-center mb-4 ${
            loading ? "opacity-50" : ""
          }`}
        >
          <AutoText className="text-white font-semibold text-base">
            {loading ? "Lägger till..." : "Lägg till E-post"}
          </AutoText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}