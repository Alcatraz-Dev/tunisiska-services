import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AppIcon from "@/app/components/ui/AppIcon";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { showAlert } from "@/app/utils/showAlert";

export default function UpdatePassword() {
  const { language } = useLanguage();
  const currentHint = useTranslationText("Ange nuvarande lösenord", language);
  const newHint = useTranslationText("Välj ett nytt lösenord", language);
  const confirmHint = useTranslationText("Bekräfta ditt nya lösenord", language);
  const { user, isLoaded } = useUser();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    setHasPassword(user.passwordEnabled || false);
  }, [user, isLoaded]);

  const handleSetOrUpdatePassword = async () => {
    if (!user) return;

    if (!newPassword || !confirmPassword || (hasPassword && !currentPassword)) {
      return showAlert("Fel", "Vänligen fyll i alla fält");
    }

    if (newPassword !== confirmPassword) {
      return showAlert("Fel", "Nytt lösenord matchar inte bekräftelsen");
    }

    try {
      setLoading(true);

      if (hasPassword) {
        await user.updatePassword({
          currentPassword: currentPassword,
          newPassword: newPassword,
        });
        showAlert("Succé", "Lösenordet uppdaterades");
      } else {
        await user.updatePassword({ newPassword });
        showAlert("Succé", "Lösenordet har skapats");
        setHasPassword(true);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error(error);
      showAlert("Fel", error?.message || "Kunde inte uppdatera lösenordet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <ScreenHeader
        title={hasPassword ? "Update password" : "Create password"}
        subtitle={hasPassword ? "Keep your account secure" : "Add a password to sign in with email"}
        showBack
      />

      <ScrollView className="flex-1 p-6">
        {/* Current Password (only if has password) */}
        {hasPassword && (
          <View className="mb-5">
            <AutoText
              className={`text-sm font-medium mb-2 ${
                isDark ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Nuvarande lösenord
            </AutoText>
            <View className="relative">
              <Input
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder={currentHint}
                placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                secureTextEntry={!showCurrent}
                className={`border rounded-xl p-4 pr-12 ${
                  isDark
                    ? "border-gray-700 bg-dark-card text-white"
                    : "border-gray-300 bg-light-card text-black"
                }`}
              />
              <TouchableOpacity
                onPress={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-4"
              >
                <AppIcon
                  name={showCurrent ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* New Password */}
        <View className="mb-5">
          <AutoText
            className={`text-sm font-medium mb-2 ${
              isDark ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Nytt lösenord
          </AutoText>
          <View className="relative">
            <Input
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={newHint}
              placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
              secureTextEntry={!showNew}
              className={`border rounded-xl p-4 pr-12 ${
                isDark
                  ? "border-gray-700 bg-dark-card text-white"
                  : "border-gray-300 bg-light-card text-black"
              }`}
            />
            <TouchableOpacity
              onPress={() => setShowNew(!showNew)}
              className="absolute right-4 top-4"
            >
              <AppIcon
                name={showNew ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password */}
        <View className="mb-6">
          <AutoText
            className={`text-sm font-medium mb-2 ${
              isDark ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Bekräfta nytt lösenord
          </AutoText>
          <View className="relative">
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={confirmHint}
              placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
              secureTextEntry={!showConfirm}
              className={`border rounded-xl p-4 pr-12 ${
                isDark
                  ? "border-gray-700 bg-dark-card text-white"
                  : "border-gray-300 bg-light-card text-black"
              }`}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-4"
            >
              <AppIcon
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Set / Update Password Button */}
        <PrimaryButton
          label={loading ? (hasPassword ? "Uppdaterar..." : "Skapar...") : hasPassword ? "Uppdatera lösenord" : "Skapa lösenord"}
          onPress={handleSetOrUpdatePassword}
          loading={loading}
          style={{ marginBottom: 16 }}
        />

        {/* Info text explaining password removal is not available */}
        {hasPassword && (
          <View className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mt-4">
            <AutoText className="text-sm text-gray-600 dark:text-gray-300 text-center">
              Lösenordsborttagning är inte tillgängligt eftersom alla användare
              måste ha ett lösenord i denna applikation.
            </AutoText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
