import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
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
import { Platform } from "react-native";

export default function AdminBackupScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>("");

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      setExportProgress("Förbereder export...");

      // Use Sanity's official backup API
      const { client } = await import("@/sanityClient");

      setExportProgress("Startar Sanity backup...");

      // Use Sanity's export API endpoint - correct format
      const response = await fetch(
        `https://${client.config().projectId}.api.sanity.io/v2021-06-07/data/export/${client.config().dataset}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${client.config().token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Sanity API error: ${response.status} ${response.statusText}`
        );
      }

      setExportProgress("Hämtar backup data...");

      // Get the backup data as text
      const backupText = await response.text();

      setExportProgress("Skapar backup-fil...");

      const backupId = Date.now().toString();
      const exportFileDefaultName = `${client.config().dataset}-backup-${backupId}.tar.gz`;

      // For web platform - download file using Next.js style
      if (Platform.OS === "web") {
        const blob = new Blob([backupText], {
          type: "application/x-ndjson",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = exportFileDefaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setExportProgress("Download påbörjad...");
        setTimeout(() => {
          showAlert(
            "Export slutförd",
            `Sanity backup-fil "${exportFileDefaultName}" har nedladdats.`
          );
          setIsExporting(false);
          setExportProgress("");
        }, 1000);
      } else {
        // For mobile platforms - save file to device and share
        try {
          setExportProgress("Sparar fil på enheten...");

          // Import expo modules
          const [expoFs, expoSharing] = await Promise.all([
            import("expo-file-system"),
            import("expo-sharing"),
          ]);

          const fileUri =
            (expoFs as any).documentDirectory + exportFileDefaultName;
          await (expoFs as any).writeAsStringAsync(fileUri, backupText);

          setExportProgress("Öppnar delningsdialog...");
          if (await expoSharing.isAvailableAsync()) {
            await expoSharing.shareAsync(fileUri, {
              mimeType: "application/x-ndjson",
              dialogTitle: "Spara Sanity Backup",
            });
            setExportProgress("Fil sparad och delas...");
            setTimeout(() => {
              showAlert(
                "Export slutförd",
                `Sanity backup-fil "${exportFileDefaultName}" har sparats på enheten och öppnas för delning/sparande.`
              );
              setIsExporting(false);
              setExportProgress("");
            }, 1000);
          } else {
            setExportProgress("Fil sparad...");
            setTimeout(() => {
              showAlert(
                "Export slutförd",
                `Sanity backup-fil "${exportFileDefaultName}" har sparats på enheten.\n\nPlats: ${fileUri}`
              );
              setIsExporting(false);
              setExportProgress("");
            }, 1000);
          }
        } catch (mobileError) {
          console.error("Mobile file save error:", mobileError);
          setExportProgress("Slutför export...");
          setTimeout(() => {
            showAlert(
              "Export slutförd",
              `Sanity backup har skapats men kunde inte sparas som fil på denna enhet. Försök igen eller använd web-versionen.`
            );
            setIsExporting(false);
            setExportProgress("");
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Export error:", error);
      showAlert(
        "Fel",
        "Kunde inte exportera data från Sanity: " + (error as Error).message
      );
      setIsExporting(false);
      setExportProgress("");
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
            Admin Backup
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 mx-5 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Exportera all data från Sanity för säkerhetskopiering och
          återställning.
        </AutoText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
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
          }}
        >
          <View className="items-center mb-4">
            <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-3">
              <Ionicons name="cloud-download" size={32} color="#fff" />
            </View>
            <AutoText className="text-white text-xl font-bold text-center mb-2">
              Sanity Data Export
            </AutoText>
            <AutoText className="text-white/90 text-center text-xs">
              Exportera all data till en .tar.gz backup-fil för
              säkerhetskopiering
            </AutoText>
          </View>

          {/* Data Types List */}
          <View className="bg-white/10 rounded-lg p-4">
            <AutoText className="text-white font-semibold mb-3 text-center">
              Data som exporteras:
            </AutoText>
            <View className="space-y-2 ">
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
                  <View className="w-1 h-1 bg-white rounded-full mr-3" />
                  <AutoText className="text-white/90 text-xs">{item}</AutoText>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* Export Button */}
        <View className="mb-8">
          {isExporting ? (
            <View
              className={`p-6 rounded-2xl items-center justify-center ${isDark ? "bg-dark-card" : "bg-light-card"}`}
            >
              <ActivityIndicator
                size="small"
                color={isDark ? "#fff" : "#000"}
              />
              <AutoText
                className={`mt-4 text-center ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {exportProgress}
              </AutoText>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleExportData}
              className="bg-blue-500 rounded-2xl p-6 items-center"
              style={{
                shadowColor: "#3B82F6",
                shadowOpacity: 0.3,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 5 },
                elevation: 8,
              }}
            >
              <View className="flex-row items-center">
                <Ionicons name="cloud-download" size={14} color="white" />
                <AutoText className="text-white font-bold text-sm ml-3">
                  Exportera Data
                </AutoText>
              </View>
              <AutoText className="text-white/90 text-xs mt-2 text-center">
                Skapa och ladda ner .tar.gz backup-fil
              </AutoText>
            </TouchableOpacity>
          )}
        </View>

        {/* Warning */}
        <View
          className={`p-4 rounded-xl mb-8 ${isDark ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-yellow-50 border border-yellow-200"}`}
        >
          <View className="flex-row items-start">
            <Ionicons
              name="warning"
              size={20}
              color={isDark ? "#fbbf24" : "#f59e0b"}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <View className="flex-1">
              <AutoText
                className={`font-semibold mb-1 ${isDark ? "text-yellow-400" : "text-yellow-800"}`}
              >
                Viktig information
              </AutoText>
              <AutoText
                className={`text-[9px] ${isDark ? "text-yellow-300" : "text-yellow-700"}`}
              >
                Denna export innehåller all känslig data från din
                Sanity-databas. Förvara backup-filen säkert och dela den inte
                med obehöriga.
              </AutoText>
            </View>
          </View>
        </View>
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
