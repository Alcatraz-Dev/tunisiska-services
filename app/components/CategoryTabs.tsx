import React, { useEffect } from "react";
import { ScrollView, TouchableOpacity, Text } from "react-native";
import Animated, {  FadeInRight,
  FadeOutLeft, } from "react-native-reanimated";
import { AutoText } from "./ui/AutoText";

type Props = {
  categories: string[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  isDark: boolean;
  index?: number
};

export default function CategoryTabs({
  categories,
  activeCategory,
  setActiveCategory,
  isDark,
  index = 0
}: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-4"
    >
      {categories.map((cat) => (
        <Animated.View
          key={cat}
          entering={FadeInRight.delay(100 * index)}
          exiting={FadeOutLeft}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setActiveCategory(cat)}
            className={`px-4 py-2 mr-2 rounded-full border mt-2 mb-3.5 ${
              activeCategory === cat
                ? "bg-primary border-primary"
                : isDark
                ? "bg-dark-card border-gray-700"
                : "bg-light-card border-gray-300"
            }`}
          >
            <AutoText
              className={`text-sm font-medium ${
                activeCategory === cat
                  ? "text-white"
                  : isDark
                  ? "text-dark-text"
                  : "text-light-text"
              }`}
            >
              {cat}
            </AutoText>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </ScrollView>
  );
}