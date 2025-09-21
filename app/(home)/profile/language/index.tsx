import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import { supportedLanguages } from "@/app/constants/languages";
import { useLanguage } from "@/app/hooks/useLanguage";
import Input from "@/app/components/ui/Input";
import { AutoText } from "@/app/components/ui/AutoText";

export default function LanguageSettings() {
  const { language, setLanguage } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [search, setSearch] = useState("");

  // Filter languages based on search input
  const filteredLanguages = useMemo(() => {
    const query = search.toLowerCase();
    return supportedLanguages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) || lang.code.toLowerCase().includes(query)
    );
  }, [search]);

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
            Språk
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center my-2 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Välj vilket språk du vill använda i appen
        </AutoText>

        {/* Search Input */}
        <View
          className={`mt-2 mb-4 rounded-full  border px-3 py-3 ${
            isDark ? "bg-dark-card border-gray-700" : "bg-light-card border-gray-300"
          }`}
        >
          <Input
            placeholder="Søk språk..."
            placeholderTextColor={isDark ? "#aaa" : "#666"}
            value={search}
            onChangeText={setSearch}
            className={`text-sm mx-2 mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
            
          />
        </View>
      </View>

      {/* Language List */}
      <ScrollView className="flex-1 px-6 py-4">
        {filteredLanguages.map((lang) => {
          const selected = language === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              onPress={() => setLanguage(lang.code)}
              activeOpacity={0.8}
              className={`p-4 mb-3 rounded-2xl shadow-sm border ${
                selected
                  ? "bg-blue-500 border-blue-600"
                  : isDark
                  ? "bg-dark-card border-gray-700"
                  : "bg-light-card border-gray-300"
              }`}
            >
              <AutoText
                className={`text-lg font-medium ${
                  selected
                    ? "text-white"
                    : isDark
                    ? "text-gray-200"
                    : "text-gray-800"
                }`}
              >
                {lang.name}
              </AutoText>
              {selected && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#fff"
                  style={{ position: "absolute", right: 16, top: 16 }}
                />
              )}
            </TouchableOpacity>
          );
        })}

        {filteredLanguages.length === 0 && (
          <AutoText
            className={`text-center mt-6 text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Inga språk matchar din sökning.
          </AutoText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}