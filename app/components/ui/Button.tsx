import React from "react";
import { StyleProp, ViewStyle } from "react-native";

import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import PrimaryButton from "./PrimaryButton";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Backwards-compatible API backed by the shared app button styles. */
export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  testID,
}: ButtonProps) {
  const { language } = useLanguage();
  const label = useTranslationText(title, language);

  return (
    <PrimaryButton
      label={label}
      onPress={onPress}
      variant={variant === "secondary" ? "accent" : variant}
      size={size}
      disabled={disabled}
      loading={loading}
      fullWidth={false}
      style={style}
      testID={testID}
    />
  );
}
