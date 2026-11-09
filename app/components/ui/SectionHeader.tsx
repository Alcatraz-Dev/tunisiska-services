import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

import ThemedText from "./ThemedText";
import { spacing } from "@/app/theme/spacing";

type SectionHeaderProps = {
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Trailing action (e.g. "See all"). */
  action?: React.ReactNode;
  translateTitle?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Section divider used between the blocks of a scrollable screen. */
export default function SectionHeader({
  title,
  subtitle,
  action,
  translateTitle = true,
  style,
}: SectionHeaderProps) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.md,
          gap: spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <ThemedText variant="title3" translate={translateTitle}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {action}
    </View>
  );
}
