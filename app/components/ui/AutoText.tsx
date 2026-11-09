import React from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { useTranslationText } from "../../hooks/useTranslation";
import { useLanguage } from "../../hooks/useLanguage";

function getPlainText(children: React.ReactNode): string | null {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (children == null || typeof children === "boolean") return "";
  if (Array.isArray(children)) {
    const parts = children.map(getPlainText);
    return parts.some((part) => part === null) ? null : parts.join("");
  }
  return null;
}

export function AutoText({
  children,
  className,
  style,
  numberOfLines,
  ellipsizeMode
}: {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  ellipsizeMode?: any;
}) {
  const { language } = useLanguage(); // must be updated
  const plainText = getPlainText(children);
  const translated = useTranslationText(plainText ?? "", language);
  return (
    <Text
      className={className}
      style={style}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
    >
      {plainText !== null && plainText ? translated || plainText : children}
    </Text>
  );
}
