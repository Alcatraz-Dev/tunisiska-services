import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { useEffect, useState } from "react";

type Translatable = string | number | (string | number)[];

export async function translate(text: Translatable, targetLang: string) {
  let textToTranslate = "";

  if (Array.isArray(text)) {
    textToTranslate = text.join(" ");
  } else if (typeof text === "string" || typeof text === "number") {
    textToTranslate = text.toString(); // safe now
  }

  if (!textToTranslate) return textToTranslate;

  const cacheKey = `translation:${targetLang}:${textToTranslate}`;
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `https://ftapi.pythonanywhere.com/translate?dl=${targetLang}&text=${encodeURIComponent(
        textToTranslate
      )}`
    );
    const result = await response.json();

    const translated = result["destination-text"];
    if (!translated || translated.trim() === "") {
      console.warn(
        "Translation returned empty, using original text:",
        textToTranslate
      );
      return textToTranslate;
    }

    await AsyncStorage.setItem(cacheKey, translated);
    return translated;
  } catch (e) {
    console.warn("Translation failed:", e);
    return textToTranslate;
  }
}

export function useTranslationText(text: Translatable, lang?: string) {
  const [translated, setTranslated] = useState(text?.toString() || '');
  const deviceLang = Localization.getLocales()[0]?.languageCode || "sv";

  useEffect(() => {
    const targetLang = lang || deviceLang;
    const textToTranslate = Array.isArray(text) ? text.join(" ") : text.toString();

    if (targetLang === "sv") {
      setTranslated(textToTranslate);
    } else {
      translate(textToTranslate, targetLang).then(setTranslated);
    }
  }, [text, lang]);

  return translated;
}