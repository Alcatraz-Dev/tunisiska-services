import React, { useState } from "react";
import { TextInput, View, TextInputProps, TouchableOpacity, StyleSheet } from "react-native";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { useTheme } from "@/app/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

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

  // Extract margin classes to apply to container instead of TextInput
  const className = props.className || "";
  const containerClasses = className.split(" ").filter(c => c.startsWith("m") || c.startsWith("p-")).join(" ");
  const inputClasses = className.split(" ").filter(c => !c.startsWith("m")).join(" ");

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <View className={containerClasses} style={styles.container}>
      <TextInput
        {...props}
        placeholder={placeholder}
        placeholderTextColor={props.placeholderTextColor || (isDark ? "#9CA3AF" : "#6B7280")}
        secureTextEntry={shouldBeSecure}
        style={[
          {
            textAlign: isRTL ? "right" : "left",
            paddingRight: isPasswordField ? 45 : undefined,
            marginBottom: 0,
            color: isDark ? "#FFFFFF" : "#111827",
          },
          props.style,
        ]}
        className={inputClasses}
      />
      {isPasswordField && (
        <TouchableOpacity
          style={styles.iconContainer}
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
        >
          <Ionicons
            name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
            size={22}
            color="#9CA3AF"
          />
        </TouchableOpacity>
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
    right: 25,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    // We remove the bottom offset so it centers within the container height
    // If the TextInput has a margin-bottom, the container will be taller
    // To fix this perfectly, the icon should be centered within the INPUT height
  },
});
