import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/app/context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { AutoText } from "@/app/components/ui/AutoText";
import { RichTextRenderer } from "@/app/components/ui/RichTextRenderer";
import { client } from "@/sanityClient";
import { termsQuery } from "@/app/hooks/useQuery";

export default function Terms() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [terms, setTerms] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const data = await client.fetch(termsQuery);
        setTerms(data);
      } catch (error) {
        console.error("Error fetching terms:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTerms();
  }, []);

  if (loading) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-dark" : "bg-light"
        }`}
      >
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
      </SafeAreaView>
    );
  }

  if (!terms) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-dark" : "bg-light"
        }`}
      >
        <AutoText className={isDark ? "text-white" : "text-gray-900"}>
          Terms of Service not found
        </AutoText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {/* Header */}
      <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className="flex-row items-center justify-center relative mb-2">
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
            {terms?.title || "Användarvillkor"}
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Läs våra villkor för att använda appen
        </AutoText>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-6 mt-4"
        showsVerticalScrollIndicator={false}
      >
        <RichTextRenderer
          content={terms?.content || []}
          className={isDark ? "text-gray-300" : "text-gray-700"}
        />

        {/* Last Updated */}
        {terms?.lastUpdated && (
          <AutoText
            className={`text-xs text-center mt-10 mb-6 ${
              isDark ? "text-gray-500" : "text-gray-500"
            }`}
          >
            Senast uppdaterad: {new Date(terms.lastUpdated).toLocaleDateString('sv-SE')}
          </AutoText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}