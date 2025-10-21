import { View, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

import icons from "@/app/constants/icons";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../hooks/useLanguage";
import { supportedLanguages } from "../constants/languages";
import { AutoText } from "./ui/AutoText";

export default function LanguageRow({ userProfile }: { userProfile?: any }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { language } = useLanguage(); // get selected language from store

  // Map codes to readable names dynamically
  const languageNames: Record<string, string> = supportedLanguages.reduce(
    (acc, lang) => {
      acc[lang.code] = lang.name;
      return acc;
    },
    {} as Record<string, string>
  );

  // Determine displayed language
  const currentLang = language || userProfile?.defaultLanguage || "sv";
  return (
    <View
      className={`flex-row items-center justify-between p-4 `}
    >
      <View className="flex-row items-center">
        <Image
          source={icons.language}
          className="w-5 h-5 mr-3"
          style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
        />
        <AutoText className={isDark ? "text-white" : "text-gray-900"}>
          Språk
        </AutoText>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push("/(home)/profile/language")}
        className="flex-row items-center"
      >
        <AutoText
          className={`mr-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          {languageNames[currentLang] || currentLang}
        </AutoText>
        <Image
          source={icons.rightArrow}
          className="w-4 h-4"
          style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
        />
      </TouchableOpacity>
    </View>
  );
}
