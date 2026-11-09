import { ScrollView, View } from "react-native";
import React, { useState } from "react";
import AppIcon from "@/app/components/ui/AppIcon";
import PressableScale from "@/app/components/ui/PressableScale";
import ThemedText from "@/app/components/ui/ThemedText";
import { useLanguage } from "@/app/hooks/useLanguage";
import { translateNow } from "@/app/hooks/useTranslation";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";

/**
 * `value` is the stored category — it stays stable so existing orders keep
 * matching. `label` is the English source string that `ThemedText` translates.
 */
const categories = [
  { label: "Furniture", value: "furniture" },
  { label: "Electronics", value: "electronics" },
  { label: "Boxes", value: "boxes" },
  { label: "Clothing", value: "clothing" },
  { label: "Fragile", value: "fragile" },
  { label: "Heavy items", value: "heavy_items" },
  { label: "Appliances", value: "appliances" },
];

function labelFor(value: string) {
  return categories.find((item) => item.value === value)?.label ?? value;
}

export default function MoveCategoryCheckbox({
  selectedCategories,
  setSelectedCategories,
}: {
  isDark?: boolean;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const theme = useThemeColors();

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 6 }}>
        <ThemedText variant="footnote" tone="secondary">
          Item type
        </ThemedText>
        <ThemedText variant="footnote" color={theme.accent}>
          *
        </ThemedText>
      </View>

      <PressableScale
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        haptic="selection"
        pressedScale={0.99}
      >
        <View
          style={{
            minHeight: 50,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: open ? theme.primary : theme.borderSubtle,
            backgroundColor: theme.surface,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <AppIcon name="cube-outline" size={18} color={theme.textTertiary} />
          <ThemedText
            variant="body"
            tone={selectedCategories.length > 0 ? "primary" : "tertiary"}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {selectedCategories.length > 0
              ? selectedCategories
                  .map((value) => translateNow(labelFor(value), language))
                  .join(", ")
              : "Select category"}
          </ThemedText>
          <AppIcon
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.textQuaternary}
          />
        </View>
      </PressableScale>

      {open && (
        <View
          style={{
            marginTop: spacing.sm,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: theme.borderSubtle,
            backgroundColor: theme.surface,
            overflow: "hidden",
          }}
        >
          <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>
            {categories.map((item, index) => {
              const selected = selectedCategories.includes(item.value);
              return (
                <PressableScale
                  key={item.value}
                  onPress={() => toggleCategory(item.value)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  haptic="selection"
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.sm,
                      paddingHorizontal: spacing.md,
                      paddingVertical: 13,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: theme.separator,
                    }}
                  >
                    <AppIcon
                      name={selected ? "checkbox" : "square-outline"}
                      size={18}
                      color={selected ? theme.primary : theme.textQuaternary}
                    />
                    <ThemedText variant="body" style={{ flex: 1 }}>
                      {item.label}
                    </ThemedText>
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
