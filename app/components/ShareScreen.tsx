import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Clipboard,
  Image,
  Platform,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import icons from "../constants/icons";
import { AutoText } from "./ui/AutoText";
import { showAlert } from "../utils/showAlert";
import Constants from "expo-constants";

const projectId =
  Constants.expoConfig?.extra?.eas?.projectId ||
  "c7b65ce0-2aa6-4b42-b6d7-4f04277bc839";

// Use the EXPO_PUBLIC_DEV_URL from environment variables
const getExpoDevUrl = () => {
  return process.env.EXPO_PUBLIC_DEV_URL || `https://expo.dev/preview/update?projectId=${projectId}&group=latest`;
};

export default function ShareScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [expoDevUrl, setExpoDevUrl] = useState<string>(
    `https://expo.dev/preview/update?projectId=${projectId}&group=latest`
  );

  useEffect(() => {
    // Generate a fresh URL each time to ensure latest group
    const url = getExpoDevUrl();
    setExpoDevUrl(url);
  }, []);

  const copyLink = async () => {
    if (!expoDevUrl) return;
    await fetch(expoDevUrl).then(
      (res) => res.ok && Clipboard.setString(expoDevUrl)
    );
    showAlert("Kopierad", "Länken har kopierats till urklipp!");
  };

  const openLink = async () => {
    if (!expoDevUrl) return;
    try {
      const supported = await fetch(expoDevUrl).then(
        (res) => res.ok && Linking.canOpenURL(expoDevUrl)
      );
      if (supported) {
        await Linking.openURL(expoDevUrl);
      } else {
        showAlert("Fel", "Kunde inte öppna Expo Dev-länken.");
      }
    } catch (err: any) {
      showAlert("Fel", err.message);
    }
  };

  const shareAppLink = async () => {
    if (!expoDevUrl) return;
    const url = await fetch(expoDevUrl).then((res) => res.ok && expoDevUrl);
    try {
      await Share.share(
        {
          message: "Kolla in denna app: " + url,
        },
        {
          dialogTitle: "Dela med vänner",
        }
      );
    } catch (error: any) {
      showAlert("Fel", "Kunde inte dela länken: " + error.message);
    }
  };

  const updateApp = async () => {
    if (!expoDevUrl) return;
    try {
      const supported = await fetch(expoDevUrl).then(
        (res) => res.ok && Linking.canOpenURL(expoDevUrl)
      );
      if (supported) {
        await Linking.openURL(expoDevUrl);
      } else {
        showAlert("Fel", "Kunde inte öppna Expo Dev-länken.");
      }
    } catch (err: any) {
      showAlert("Fel", err.message);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Fixed Header */}
      <View className={`px-6 pt-6 pb-4  ${isDark ? "bg-dark" : "bg-light"} `}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons
              name="arrow-back"
              size={28}
              color={isDark ? "#fff" : "#000"}
            />
          </TouchableOpacity>
          <AutoText
            className={`text-2xl font-extrabold text-center flex-1 mb-5 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Dela Appen
          </AutoText>
          <View style={{ width: 28 }} />
        </View>
        <AutoText
          className={`text-center my-2  text-sm ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Skanna QR-koden eller använd länken för att öppna appen i Expo Go
        </AutoText>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={{ padding: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Code */}
        <View
          className={`mx-auto my-8 rounded-xl border ${
            isDark
              ? "border-gray-700  bg-dark-card"
              : "border-gray-300  bg-gray-100"
          }`}
          style={{
            width: 240,
            height: 240,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <QRCode
            value={expoDevUrl}
            size={200}
            color={isDark ? "#fff" : "#000"}
            backgroundColor={isDark ? "#1c1c1e" : "#fff"}
          />
        </View>

        {/* Expo Dev Link */}
        <View className="mb-6">
          <AutoText
            className={`my-2 font-semibold text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Expo Dev Länk
          </AutoText>
          <View
            className={`flex-row justify-between items-center border rounded-lg px-4 py-3 shadow-sm ${
              isDark
                ? "border-gray-700 bg-dark-card"
                : "border-gray-300 bg-light-card"
            }`}
          >
            <AutoText
              className={`flex-1 text-xs ${
                isDark ? "text-white" : "text-gray-900"
              }`}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {expoDevUrl}
            </AutoText>
            <View className="flex-row ml-2">
              <TouchableOpacity onPress={copyLink} className="px-2">
                <Image
                  source={icons.copie}
                  className="w-6 h-6"
                  resizeMode="contain"
                  tintColor={isDark ? "#fff" : "#000"}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={openLink} className="px-2">
                <Image
                  source={icons.glob}
                  className="w-6 h-6"
                  resizeMode="contain"
                  tintColor={isDark ? "#0ea5e9" : "#0ea5e9"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Share Buttons & Update App Button */}
        <View className="flex-row space-y-4 mt-5 mb-6 gap-3 flex justify-center w-full">
          <TouchableOpacity
            onPress={shareAppLink}
            className="flex-row items-center justify-center bg-blue-600 px-6 py-3 rounded-xl shadow-md  w-full max-w-[190px]"
          >
            <Ionicons name="share-social-outline" size={14} color="#fff" />
            <AutoText className="text-white font-semibold ml-2">Dela </AutoText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={updateApp}
            className="flex-row items-center justify-center bg-blue-600 px-6 py-3 rounded-xl shadow-md  w-full max-w-[190px] "
          >
            <Ionicons name="cloud-download-outline" size={14} color="#fff" />
            <AutoText className="text-white font-semibold ml-2">
              Uppdatera{" "}
            </AutoText>
          </TouchableOpacity>
        </View>

        <AutoText
          className={`text-center text-sm ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Länken fungerar endast om användaren har Expo Go installerad.
        </AutoText>
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
