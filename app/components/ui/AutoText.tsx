import React from "react";
import { Text } from "react-native";
import { useTranslationText } from "../../hooks/useTranslation";
import { useLanguage } from "../../hooks/useLanguage";

const rtlLanguages = ["ar"];
export function AutoText({
  children,
  className,
  style,
  numberOfLines,
  ellipsizeMode
}: {
  children: any;
  className?: string;
  style?: object;
  numberOfLines?: number;
  ellipsizeMode?: any;
}) {
  const { language } = useLanguage(); // must be updated
  const translated = useTranslationText(children, language);
  const isRTL = rtlLanguages.includes(language);
  return (
    <Text
      className={className}
      style={[style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
    >
      {translated || children}
    </Text>
  );
}
