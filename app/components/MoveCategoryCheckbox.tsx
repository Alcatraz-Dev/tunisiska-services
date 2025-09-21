import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { AutoText } from "./ui/AutoText";

const categories = ["Elektronik", "Möbler", "Kläder", "Annat"];

export default function MoveCategoryCheckbox({
  isDark,
  selectedCategories,
  setSelectedCategories,
}: {
  isDark: boolean;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  return (
    <View className="mb-4">
      <AutoText className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
        Typ av föremål
      </AutoText>

      <TouchableOpacity
        onPress={() => setOpen(!open)}
        className={`border rounded-lg p-4 flex-row justify-between items-center ${
          isDark ? "bg-dark-card" : "bg-light-card"
        }`}
      >
        <AutoText className={`${isDark ? "text-white" : "text-black"}`}>
          {selectedCategories.length > 0
            ? selectedCategories.join(", ")
            : "Välj kategori"}
        </AutoText>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={isDark ? "white" : "black"}
        />
      </TouchableOpacity>

      {open && (
        <ScrollView
          className={`border rounded-lg mt-1 max-h-60 ${
            isDark
              ? "bg-dark-card border-gray-700"
              : "bg-light-card border-gray-300"
          }`}
        >
          {categories.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => toggleCategory(item)}
              className="p-4 flex-row items-center justify-between border-b border-gray-200"
            >
              <AutoText className={`${isDark ? "text-white" : "text-black"}`}>
                {item}
              </AutoText>
              {selectedCategories.includes(item) && (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={isDark ? "white" : "black"}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
