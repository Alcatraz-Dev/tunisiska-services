import { create } from "zustand";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

type LanguageState = {
  language: string;
  setLanguage: (lang: string) => void;
};

export const useLanguage = create<LanguageState>((set) => {
  const deviceLang = Localization.getLocales()[0]?.languageCode || "en";

  // Load saved language from AsyncStorage
  AsyncStorage.getItem("appLanguage").then((saved) => {
    if (saved) set({ language: saved });
  });

  return {
    language: deviceLang,
    setLanguage: (lang) => {
      AsyncStorage.setItem("appLanguage", lang); // persist
      set({ language: lang });
    },
  };
});