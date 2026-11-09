import React, { useMemo } from "react";
import { Text, TextProps, TextStyle, StyleProp } from "react-native";

import { useThemeColors } from "@/app/theme";
import { typeScale, letterSpacing } from "@/app/theme/typography";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";

type TypeToken = keyof typeof typeScale;

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

export type ThemedTextProps = TextProps & {
  /** Type ramp step. */
  variant?: TypeToken;
  /** Colour token key, or a literal colour. */
  color?: string;
  /** Semantic colour shortcut. */
  tone?: "primary" | "secondary" | "tertiary" | "accent" | "inverse" | "onAccent";
  align?: TextStyle["textAlign"];
  /** Apply the overline letter-spacing. */
  tracked?: boolean;
  /** Translate through the app's localization layer. */
  translate?: boolean;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
};

/**
 * The design-system text primitive.
 *
 * Typography comes from the token scale; colour from the active theme. Text is
 * routed through the app's existing translation layer by default so the new
 * screens behave like the rest of the product. CMS-authored content can opt out
 * with `translate={false}`.
 */
export default function ThemedText({
  variant = "body",
  color,
  tone,
  align,
  tracked,
  translate = true,
  style,
  children,
  ...rest
}: ThemedTextProps) {
  const theme = useThemeColors();
  const { language } = useLanguage();
  const raw = getPlainText(children) ?? "";

  const translated = useTranslationText(translate ? raw : "", language);

  const text = translate && raw ? translated || raw : children;

  const resolvedColor = useMemo(() => {
    if (color) return color;
    switch (tone) {
      case "secondary":
        return theme.textSecondary;
      case "tertiary":
        return theme.textTertiary;
      case "accent":
        return theme.accent;
      case "inverse":
        return theme.textInverse;
      case "onAccent":
        return theme.textOnAccent;
      case "primary":
      default:
        return theme.textPrimary;
    }
  }, [color, tone, theme]);

  return (
    <Text
      {...rest}
      style={[
        typeScale[variant],
        { color: resolvedColor },
        align ? { textAlign: align } : null,
        tracked ? { letterSpacing: letterSpacing.overline } : null,
        style,
      ]}
    >
      {text}
    </Text>
  );
}
