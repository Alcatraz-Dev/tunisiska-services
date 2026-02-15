import React, { useState } from "react";
import { TextInput, View, TextInputProps, TouchableOpacity, StyleSheet } from "react-native";
import { useLanguage } from "@/app/hooks/useLanguage";
import { useTranslationText } from "@/app/hooks/useTranslation";
import { Ionicons } from "@expo/vector-icons";

const rtlLanguages = ["ar"];

export default function Input(props: TextInputProps) {
  const { language } = useLanguage();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const placeholder = useTranslationText(props.placeholder || "Placeholder", language);
  const isRTL = rtlLanguages.includes(language);

  const isPasswordField = props.secureTextEntry;
  const shouldBeSecure = isPasswordField && !isPasswordVisible;

  // Extract margin classes to apply to container instead of TextInput
  const className = props.className || "";
  const containerClasses = className.split(" ").filter(c => c.startsWith("m") || c.startsWith("p-")).join(" ");
  const inputClasses = className.split(" ").filter(c => !c.startsWith("m")).join(" ");

  return (
    <View className={containerClasses} style={styles.container}>
      <TextInput
        {...props}
        placeholder={placeholder}
        secureTextEntry={shouldBeSecure}
        style={[
          props.style,
          {
            textAlign: isRTL ? "right" : "left",
            paddingRight: isPasswordField ? 45 : undefined,
            marginBottom: 0, // Reset margin on input itself
          }
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
