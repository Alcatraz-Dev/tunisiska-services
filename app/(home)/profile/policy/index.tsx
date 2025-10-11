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
import { policyQuery } from "@/app/hooks/useQuery";

export default function Policy() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const data = await client.fetch(policyQuery);
        setPolicy(data);
      } catch (error) {
        console.error("Error fetching policy:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
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

  if (!policy) {
    return (
      <SafeAreaView
        className={`flex-1 items-center justify-center ${
          isDark ? "bg-dark" : "bg-light"
        }`}
      >
        <AutoText className={isDark ? "text-white" : "text-gray-900"}>
          Privacy Policy not found
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
            {policy?.title || "Policy"}
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Läs vår integritetspolicy och användarvillkor
        </AutoText>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-6 mt-4"
        showsVerticalScrollIndicator={false}
      >
        <RichTextRenderer
          content={policy?.content || []}
          className={isDark ? "text-gray-300" : "text-gray-700"}
        />

        {/* Last Updated */}
        {policy?.lastUpdated && (
          <AutoText
            className={`text-xs text-center mt-10 mb-6 ${
              isDark ? "text-gray-500" : "text-gray-500"
            }`}
          >
            Senast uppdaterad: {new Date(policy.lastUpdated).toLocaleDateString('sv-SE')}
          </AutoText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
