// components/ServiceCard.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";
import { AutoText } from "./ui/AutoText";

interface ServiceCardProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  isDark: boolean;
  index?: number;
  onPress: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  description,
  icon,
  color,
  isDark,
  onPress,
  index = 0,
}) => {
  return (
    <Animated.View entering={FadeInUp.delay(100 * index)} exiting={FadeOutDown}>
      <TouchableOpacity
        onPress={onPress}
        className={`rounded-2xl p-5 shadow-md ${isDark ? "bg-dark-card" : "bg-light-card"}`}
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <View className="flex-row items-center">
          <View
            className="w-12 h-12 rounded-xl items-center justify-center mr-4"
            style={{ backgroundColor: `${color}20` }}
          >
            <Ionicons name={icon as any} size={26} color={color} />
          </View>
          <View className="flex-1">
            <AutoText className={`font-bold text-sm ${isDark ? "text-dark-text" : "text-light-text"}`}>
              {title}
            </AutoText>
            <AutoText className={`text-xs mt-1 ${isDark ? "text-dark-text/60" : "text-light-text/60"}`}>
              {description}
            </AutoText>
          </View>
          <Ionicons name="chevron-forward" size={20} color="gray" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default ServiceCard;