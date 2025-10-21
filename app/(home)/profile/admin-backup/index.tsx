import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AutoText } from "@/app/components/ui/AutoText";
import { showAlert } from "@/app/utils/showAlert";
import { getPremiumGradient } from "@/app/utils/getPremiumGradient";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system/legacy";
import { shareAsync } from "expo-sharing";
import { getServerURL } from "@/app/lib/getServerURL";

export default function AdminBackupScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      setExportProgress("Hämtar data från server...");

      const serverURL = getServerURL();
      const response = await fetch(`${serverURL}/sanity/export`);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const backupText = await response.text();
      const fileName = `sanity-backup-${
        new Date().toISOString().split("T")[0]
      }.ndjson`;

      const fileUri = (FileSystem as any).documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, backupText);

      if (Platform.OS === "android") {
        const permissions = await (
          FileSystem as any
        ).StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64 = Buffer.from(backupText).toString("base64");
          const newFileUri = await (
            FileSystem as any
          ).StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName,
            "application/x-ndjson"
          );
          await FileSystem.writeAsStringAsync(newFileUri, base64, {
            encoding: (FileSystem as any).EncodingType.Base64,
          });
          showAlert("Export klar", "Backup-filen sparades i vald mapp.");
        } else {
          await shareAsync(fileUri);
        }
      } else {
        await shareAsync(fileUri);
      }

      setIsExporting(false);
      setExportProgress("");
    } catch (err: any) {
      console.error("Export error:", err);
      showAlert("Fel", "Kunde inte exportera data: " + err.message);
      setIsExporting(false);
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
             Backup Data 
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 mx-5 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Exportera all Sanity CMS data som NDJSON för säkerhetskopiering
        </AutoText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <LinearGradient
          colors={getPremiumGradient() as [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 5,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            marginHorizontal: 16,
            marginTop: 20,
          }}
        >
          <View className="items-center mb-4">
            <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-3">
              <Ionicons name="cloud-download" size={32} color="#fff" />
            </View>
            <AutoText className="text-white text-xl font-bold text-center mb-2">
              Sanity Data Export
            </AutoText>
            <AutoText className="text-white/90 text-center text-sm">
              Exportera all data till en .zgr-fil för säkerhetskopiering
            </AutoText>
          </View>

          {/* Data Types List */}
          <View className="bg-white/10 rounded-lg p-4">
            <AutoText className="text-white font-semibold mb-3 text-center">
              Data som exporteras:
            </AutoText>
            <View className="space-y-2">
              {[
                "Användare",
                "Flyttbeställningar",
                "Fraktbeställningar",
                "Taxibeställningar",
                "Flyttstädningar",
                "Annonser",
                "Vänförfrågningar",
              ].map((item, index) => (
                <View key={index} className="flex-row items-center">
                  <View className="w-2 h-2 bg-white rounded-full mr-3" />
                  <AutoText className="text-white/90 text-sm">{item}</AutoText>
                </View>
              ))}
            </View>
            <View className="mt-4 flex-row items-center justify-center mb-3">
             <Ionicons
                name="information-circle"
                size={20}
                color={isDark ? "#fff" : "#fff"}
              />
              <AutoText
                className={`ml-2 font-semibold text-sm ${isDark ? "text-white" : "text-black"}`}
              >
                Backup Information
              </AutoText>
              
              </View>
               <AutoText
              className={`text-xs leading-5 px-6 text-center ${isDark ? "text-gray-300" : "text-gray-600"}`}
            >
              Detta kommer att exportera allt ditt Sanity CMS innehåll inklusive
              sidor, inlägg, användare och mediafiler. Backup-filen sparas i
              NDJSON-format och kan användas för att återställa dina data om det
              behövs.
            </AutoText>
          </View>
        </LinearGradient>

       

        {/* Export Button */}
        <View className="px-6 mt-6">
          <TouchableOpacity
            onPress={handleExportData}
            disabled={isExporting}
            className={`rounded-2xl p-6 items-center shadow-lg ${
              isExporting
                ? isDark
                  ? "bg-gray-600"
                  : "bg-gray-400"
                : "bg-gradient-to-r from-blue-500 to-blue-600"
            }`}
          >
            {isExporting ? (
              <View className="items-center">
                <ActivityIndicator color="#fff" size="large" />
                <AutoText className="text-white font-semibold mt-4 text-center">
                  {exportProgress}
                </AutoText>
                <AutoText className="text-white/80 text-sm mt-2 text-center">
                  Vänta medan vi förbereder din backup...
                </AutoText>
              </View>
            ) : (
              <View className="items-center">
                <View
                  className={`p-3 rounded-full mb-3 ${isDark ? "bg-white/20" : "bg-white/30"}`}
                >
                  <Ionicons name="cloud-download" size={28} color="#fff" />
                </View>
                <AutoText className="text-white font-bold text-lg mb-1">
                  Exportera Database Backup
                </AutoText>
                <AutoText className="text-white/90 text-sm text-center">
                  Ladda ner komplett Sanity CMS data
                </AutoText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Additional Info */}
        {!isExporting && (
          <View className="px-6 mt-6">
            <View
              className={`rounded-2xl p-4 shadow-sm ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              <View className="flex-row items-center mb-2">
                <Ionicons
                  name="time"
                  size={16}
                  color={isDark ? "#9ca3af" : "#6b7280"}
                />
                <AutoText
                  className={`ml-2 text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  Uppskattad tid
                </AutoText>
              </View>
              <AutoText
                className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                Backup-processen tar vanligtvis 30-60 sekunder beroende på
                datamängd
              </AutoText>
            </View>
          </View>
        )}
        {/* Warning */}
        <View className="px-6 mt-6">
          <View
            className={`p-4  rounded-xl mb-8 ${isDark ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-yellow-50 border border-yellow-200"}`}
          >
            <View className="flex-row items-start">
              <Ionicons
                name="warning"
                size={14}
                color={isDark ? "#fbbf24" : "#f59e0b"}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View className="flex-1">
                <AutoText
                  className={`font-semibold mb-1 text-sm ${isDark ? "text-yellow-400" : "text-yellow-800"}`}
                >
                  Viktig information
                </AutoText>
                <AutoText
                  className={`text-xs ${isDark ? "text-yellow-300" : "text-yellow-700"}`}
                >
                  Denna export innehåller all känslig data från din
                  Sanity-databas. Förvara backup-filen säkert och dela den inte
                  med obehöriga.
                </AutoText>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View className="h-20" />
      </ScrollView>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
