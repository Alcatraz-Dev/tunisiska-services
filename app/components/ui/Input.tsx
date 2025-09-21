import React from "react";
import { TextInput, View, TextInputProps } from "react-native";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
const rtlLanguages = ["ar"];
export default function Input(props: TextInputProps) {
  const { language } = useLanguage();
 const placeholder = useTranslationText(props.placeholder || "Placeholder", language);
  const isRTL = rtlLanguages.includes(language);
  return (
    <View>
      <TextInput
        {...props} 
        placeholder={placeholder}
        style={[props.style ,  { textAlign: isRTL ? "right" : "left" }]}
        className={props.className}
      />
    </View>
  );
}
