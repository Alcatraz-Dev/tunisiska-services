import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/app/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { AutoText } from "./ui/AutoText";

export default function UserEmails() {
  const { user, isLoaded } = useUser();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (!isLoaded || !user) {
    return (
      <AutoText className={`${isDark ? "text-white" : "text-gray-900"} p-6`}>
        Loading...
      </AutoText>
    );
  }

  const emails = user.emailAddresses;
  const primaryEmail = user.primaryEmailAddress;

  return (
    <ScrollView className="flex-1 ">
      <AutoText
        className={`text-xl font-bold mb-4 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        Alla e-postadresser
      </AutoText>

      {emails.map((email) => {
        const isActive = email.id === primaryEmail?.id;
        return (
          <TouchableOpacity
            key={email.id}
            onPress={() => Linking.openURL(`mailto:${email.emailAddress}`)}
            className="flex-row items-center justify-between mb-3"
            activeOpacity={0.7}
          >
            <AutoText
              className={`text-sm font-medium ${
                isActive
                  ? "text-blue-500"
                  : isDark
                  ? "text-gray-200"
                  : "text-gray-800"
              }`}
            >
              {email.emailAddress}
            </AutoText>
            {isActive && (
              <View className="flex-row items-center space-x-1 gap-3">
                <AutoText className="text-sm text-green-500">Active</AutoText>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={isDark ? "#34D399" : "#10B981"} // Tailwind green-400 / green-500
                />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
