import { create } from "zustand";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";

type LanguageState = {
  language: string;
  setLanguage: (lang: string) => void;
  loadSavedLanguage: () => Promise<void>;
  _hasLoaded: boolean;
  _setHasLoaded: (loaded: boolean) => void;
};

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: Localization.getLocales()[0]?.languageCode || "sv",
  _hasLoaded: false,
  
  _setHasLoaded: (loaded: boolean) => {
    set({ _hasLoaded: loaded });
  },
  
  loadSavedLanguage: async () => {
    try {
      const saved = await AsyncStorage.getItem("appLanguage");
      if (saved) {
        set({ language: saved, _hasLoaded: true });
      } else {
        set({ _hasLoaded: true });
      }
    } catch (error) {
      // Handle AsyncStorage errors gracefully (e.g., in web environment)
      console.warn("Failed to load saved language:", error);
      set({ _hasLoaded: true });
    }
  },
  
  setLanguage: async (lang) => {
    try {
      await AsyncStorage.setItem("appLanguage", lang);
      set({ language: lang });
    } catch (error) {
      // Handle AsyncStorage errors gracefully (e.g., in web environment)
      console.warn("Failed to save language:", error);
      // Still update the state even if storage fails
      set({ language: lang });
    }
  },
}));

// Auto-loading wrapper hook
export const useLanguage = () => {
  const store = useLanguageStore();
  
  useEffect(() => {
    if (!store._hasLoaded) {
      store.loadSavedLanguage();
    }
  }, [store._hasLoaded]);
  
  return {
    language: store.language,
    setLanguage: store.setLanguage,
    loadSavedLanguage: store.loadSavedLanguage,
  };
};
