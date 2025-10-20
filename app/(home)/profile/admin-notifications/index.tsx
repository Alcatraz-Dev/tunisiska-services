import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import { AutoText } from "@/app/components/ui/AutoText";
import { SafeAreaView } from "react-native-safe-area-context";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AdminNotificationsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      showAlert("Fel", "Titel och meddelande krävs");
      return;
    }

    // No longer need scheduled validation

    setLoading(true);
    try {
      const notificationData: any = {
        title: title.trim(),
        message: message.trim(),
        pushData: {
          type: "admin_broadcast",
          timestamp: new Date().toISOString(),
        }
      };

      // Add image if provided
      if (imageUrl.trim()) {
        notificationData.image = imageUrl.trim();
        notificationData.pushData.image = imageUrl.trim();
      }

      console.log('Sending notification with data:', notificationData);
      let result;
      // Send immediate notification
      result = await nativeNotifyAPI.sendNotification(notificationData);
      console.log('Notification result:', result);

      console.log('Notification send result:', result);

      if (result.success) {
        const successMessage = "Notifikation skickad till alla användare!";
        showAlert("Lyckades", successMessage);
        setTitle("");
        setMessage("");
        setImageUrl("");
      } else {
        showAlert("Fel", result.error || "Kunde inte skicka notifikation");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      showAlert("Fel", "Ett fel uppstod när notifikationen skulle skickas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className="flex-row items-center justify-center mb-4 relative">
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
            className={`text-2xl font-extrabold text-center ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Skicka Notifikation
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 mx-5 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Skicka notifikationer till alla användare
        </AutoText>
      </View>

      <ScrollView
        className={`flex-1 px-6 ${isDark ? "bg-dark" : "bg-light"}`}
        showsVerticalScrollIndicator={false}
      >
        <View className="space-y-6">
          {/* Title Input */}
          <View>
            <AutoText
              className={`text-lg font-semibold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Titel
            </AutoText>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="Ange notifikationstitel"
              className={`w-full p-4 rounded-xl border mb-4 ${
                isDark
                  ? "border-gray-700 bg-dark-card text-white"
                  : "border-gray-300 bg-white text-gray-900"
              }`}
            />
          </View>

          {/* Message Input */}
          <View>
            <AutoText
              className={`text-lg font-semibold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Meddelande
            </AutoText>
            <Input
              value={message}
              onChangeText={setMessage}
              placeholder="Ange notifikationsmeddelande"
              multiline
              numberOfLines={4}
              className={`w-full p-4 rounded-xl border mb-4 ${
                isDark
                  ? "border-gray-700 bg-dark-card text-white"
                  : "border-gray-300 bg-white text-gray-900"
              }`}
              style={{ height: 120, textAlignVertical: 'top' }}
            />
          </View>


          {/* Image URL Input */}
          <View>
            <AutoText
              className={`text-lg font-semibold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Bild URL (valfritt)
            </AutoText>
            <Input
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://example.com/image.jpg"
              className={`w-full p-4 rounded-xl border mb-4 ${
                isDark
                  ? "border-gray-700 bg-dark-card text-white"
                  : "border-gray-300 bg-white text-gray-900"
              }`}
            />
            <AutoText
              className={`text-xs ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Lämna tomt om ingen bild önskas
            </AutoText>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={sendNotification}
            disabled={loading}
            className={`w-full p-4 rounded-xl items-center mt-2 ${
              isDark ? "bg-blue-600" : "bg-blue-500"
            } ${loading ? "opacity-50" : ""}`}
          >
            <AutoText className="text-white font-semibold text-lg">
              {loading ? "Skickar..." : "Skicka Notifikation"}
            </AutoText>
          </TouchableOpacity>

          {/* Info Section */}
          <View
            className={`rounded-2xl p-5 mt-5 ${
              isDark ? "bg-dark-card" : "bg-gray-100"
            }`}
          >
            <AutoText
              className={`text-base font-semibold mb-3 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Information
            </AutoText>
            <AutoText
              className={`text-sm mb-2 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              • Notifikationer skickas till alla registrerade användare
            </AutoText>
            <AutoText
              className={`text-sm mb-2 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              • Användare måste ha push-notifikationer aktiverade
            </AutoText>
            <AutoText
              className={`text-sm ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              • Notifikationer visas även i appens notifikationsflöde
            </AutoText>
          </View>
        </View>
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}