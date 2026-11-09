import React, { useState } from "react";
import { TextInput, View, TextInputProps, StyleSheet } from "react-native";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import PressableScale from "./PressableScale";
import { useThemeColors } from "@/app/theme";
import { minTouchTarget, spacing } from "@/app/theme/spacing";
import AppIcon from "@/app/components/ui/AppIcon";

const rtlLanguages = ["ar"];

interface InputProps extends TextInputProps {
  isPassword?: boolean;
}

export default function Input(props: InputProps) {
  const { language } = useLanguage();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const placeholder = useTranslationText(props.placeholder || "Placeholder", language);
  const isRTL = rtlLanguages.includes(language);

  const isPasswordField = props.isPassword || props.secureTextEntry;
  const shouldBeSecure = isPasswordField && !isPasswordVisible;

  // Keep margins on the wrapper so they don't alter the native field's frame.
  const className = props.className || "";
  const containerClasses = className.split(" ").filter(c => c.startsWith("m")).join(" ");
  const inputClasses = className.split(" ").filter(c => !c.startsWith("m")).join(" ");

  const theme = useThemeColors();

  return (
    <View className={containerClasses} style={styles.container}>
      <TextInput
        {...props}
        placeholder={placeholder}
        placeholderTextColor={props.placeholderTextColor || theme.textQuaternary}
        secureTextEntry={shouldBeSecure}
        style={[
          {
            textAlign: isRTL ? "right" : "left",
            paddingRight: isPasswordField ? 45 : undefined,
            marginBottom: 0,
            color: theme.textPrimary,
          },
          props.style,
        ]}
        className={inputClasses}
      />
      {isPasswordField && (
        <PressableScale
          style={styles.iconContainer}
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          accessibilityRole="button"
          accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
          accessibilityState={{ selected: isPasswordVisible }}
          haptic="selection"
        >
          <AppIcon
            name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={theme.textTertiary}
          />
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
  },
  iconContainer: {
    position: "absolute",
    right: spacing.xs,
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    // We remove the bottom offset so it centers within the container height
    // If the TextInput has a margin-bottom, the container will be taller
    // To fix this perfectly, the icon should be centered within the INPUT height
  },
});
