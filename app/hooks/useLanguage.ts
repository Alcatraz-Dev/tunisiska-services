import { create } from "zustand";
import * as Localization from "expo-localization";
import { I18nManager, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { reloadAppAsync } from "expo";
import { useEffect } from "react";

export type AppLanguage = "en" | "sv" | "ar";

export const supportedLanguages = [
  { code: "en" as const, name: "English", nativeName: "English" },
  { code: "sv" as const, name: "Swedish", nativeName: "Svenska" },
  { code: "ar" as const, name: "Arabic", nativeName: "العربية" },
];

const languageCodes = new Set<AppLanguage>(["en", "sv", "ar"]);

export function normalizeLanguage(value?: string | null): AppLanguage {
  const code = value?.toLowerCase().split(/[-_]/)[0] as AppLanguage | undefined;
  return code && languageCodes.has(code) ? code : "sv";
}

type LanguageState = {
  language: AppLanguage;
  setLanguage: (lang: string) => Promise<void>;
  loadSavedLanguage: () => Promise<void>;
  _hasLoaded: boolean;
  _isLoading: boolean;
};

async function keepNativeLayoutLTR() {
  if (Platform.OS === "web") return false;

  const layoutIsRTL = I18nManager.isRTL;
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
  I18nManager.swapLeftAndRightInRTL(false);
  if (!layoutIsRTL) return false;

  try {
      await reloadAppAsync("Restore left-to-right app layout");
  } catch (error) {
    // Expo Go and development clients can handle the reload differently.
    // The language choice is already saved and direction will apply on relaunch.
    console.warn("Could not reload after changing text direction:", error);
  }

  return true;
}

const deviceLanguage = normalizeLanguage(
  Localization.getLocales()[0]?.languageCode,
);

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: deviceLanguage,
  _hasLoaded: false,
  _isLoading: false,

  loadSavedLanguage: async () => {
    if (get()._hasLoaded || get()._isLoading) return;
    set({ _isLoading: true });

    let language = deviceLanguage;
    try {
      const saved = await AsyncStorage.getItem("appLanguage");
      if (saved) language = normalizeLanguage(saved);
    } catch (error) {
      console.warn("Failed to load saved language:", error);
    }

    // A manual choice made while storage was loading wins over stale storage.
    if (get()._hasLoaded) language = get().language;
    set({ language, _hasLoaded: true, _isLoading: false });
    await keepNativeLayoutLTR();
  },

  setLanguage: async (value) => {
    const language = normalizeLanguage(value);
    const previous = get().language;
    set({ language, _hasLoaded: true });

    try {
      await AsyncStorage.setItem("appLanguage", language);
    } catch (error) {
      console.warn("Failed to save language:", error);
    }

    if ((previous === "ar") !== (language === "ar")) await keepNativeLayoutLTR();
  },
}));

/** App-wide language state shared by every route and text primitive. */
export function useLanguage() {
  const language = useLanguageStore((state) => state.language);
  const hasLoaded = useLanguageStore((state) => state._hasLoaded);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const loadSavedLanguage = useLanguageStore((state) => state.loadSavedLanguage);

  useEffect(() => {
    if (!hasLoaded) void loadSavedLanguage();
  }, [hasLoaded, loadSavedLanguage]);

  return { language, setLanguage, loadSavedLanguage };
}
