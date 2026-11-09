import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleProp,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import AppIcon from "@/app/components/ui/AppIcon";
import Input from "@/app/components/ui/Input";
import PressableScale from "@/app/components/ui/PressableScale";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";

/** Room left at the end of the scroll view for the sticky footer. */
const FOOTER_CLEARANCE = 200;

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Shared building blocks for every service booking screen.
 *
 * The point is consistency: one header treatment, one field language, one
 * selection language and one price summary across taxi, moving, cleaning,
 * shipping and container bookings.
 */

/* ── Screen shell ───────────────────────────────────────────────────── */

export function BookingScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const theme = useThemeColors();
  const { resolvedTheme } = useTheme();

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader title={title} subtitle={subtitle} showBack />
      {children}
    </SafeAreaView>
  );
}

export function BookingScroll({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        {
          paddingHorizontal: spacing.gutter,
          paddingTop: spacing.sm,
          paddingBottom: FOOTER_CLEARANCE,
        },
        style,
      ]}
    >
      {children}
    </ScrollView>
  );
}

/* ── Section heading ────────────────────────────────────────────────── */

export function BookingSection({
  title,
  subtitle,
  icon,
  style,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeColors();

  return (
    <View style={[{ marginTop: spacing.xl, marginBottom: spacing.md }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        {icon ? (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: radii.xs,
              backgroundColor: theme.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppIcon name={icon} size={15} color={theme.primary} />
          </View>
        ) : null}
        <ThemedText variant="title3">{title}</ThemedText>
      </View>
      {subtitle ? (
        <ThemedText variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

/* ── Fields ─────────────────────────────────────────────────────────── */

export function BookingField({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  const theme = useThemeColors();

  return (
    <View style={{ marginBottom: spacing.md }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          marginBottom: 6,
        }}
      >
        <ThemedText variant="footnote" tone="secondary">
          {label}
        </ThemedText>
        {required ? (
          <ThemedText variant="footnote" color={theme.accent}>
            *
          </ThemedText>
        ) : null}
      </View>
      {children}
      {hint ? (
        <ThemedText variant="footnote" tone="tertiary" style={{ marginTop: 6 }}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

export type BookingInputProps = TextInputProps & {
  label: string;
  required?: boolean;
  hint?: string;
};

export function BookingInput({
  label,
  required,
  hint,
  style,
  multiline,
  ...rest
}: BookingInputProps) {
  const theme = useThemeColors();

  return (
    <BookingField label={label} required={required} hint={hint}>
      <View
        style={{
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: theme.borderSubtle,
          backgroundColor: theme.surface,
          minHeight: multiline ? 104 : 50,
          paddingHorizontal: spacing.md,
          paddingVertical: multiline ? spacing.sm : 0,
          justifyContent: "center",
        }}
      >
        <Input
          {...rest}
          multiline={multiline}
          placeholderTextColor={theme.textQuaternary}
          style={[
            {
              fontSize: 15,
              color: theme.textPrimary,
              paddingVertical: multiline ? spacing.sm : 12,
              minHeight: multiline ? 84 : undefined,
              textAlignVertical: multiline ? "top" : "center",
            } as TextStyle,
            style,
          ]}
        />
      </View>
    </BookingField>
  );
}

export function BookingPickerField({
  label,
  required,
  icon,
  hint,
  onPress,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: IconName;
  hint?: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const theme = useThemeColors();

  return (
    <BookingField label={label} required={required} hint={hint}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
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
            borderColor: theme.borderSubtle,
            backgroundColor: theme.surface,
            paddingHorizontal: spacing.md,
          }}
        >
          {icon ? (
            <AppIcon name={icon} size={18} color={theme.textTertiary} />
          ) : null}
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" translate={false}>
              {children}
            </ThemedText>
          </View>
          <AppIcon name="chevron-down" size={16} color={theme.textQuaternary} />
        </View>
      </PressableScale>
    </BookingField>
  );
}

export function BookingToggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  const theme = useThemeColors();

  return (
    <BookingField label={label} hint={hint}>
      <View
        style={{
          flexDirection: "row",
          gap: 3,
          padding: 3,
          borderRadius: radii.md,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.borderSubtle,
        }}
      >
        {[true, false].map((option) => {
          const active = value === option;
          return (
            <PressableScale
              key={String(option)}
              onPress={() => onChange(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              haptic="selection"
              style={{ flex: 1 }}
            >
              <View
                style={{
                  height: 40,
                  borderRadius: radii.sm,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? theme.primary : "transparent",
                }}
              >
                <ThemedText
                  variant="headline"
                  style={{ color: active ? theme.textOnAccent : theme.textSecondary }}
                >
                  {option ? "Yes" : "No"}
                </ThemedText>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </BookingField>
  );
}

/* ── Selectable rows ────────────────────────────────────────────────── */

export function BookingChoice({
  selected,
  title,
  subtitle,
  icon,
  trailing,
  onPress,
  children,
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  icon?: IconName;
  trailing?: string;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  const theme = useThemeColors();

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      haptic="selection"
      pressedScale={0.99}
    >
      <View
        style={{
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: selected ? theme.primary : theme.borderSubtle,
          backgroundColor: selected ? theme.primarySoft : theme.surface,
          padding: spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: selected ? theme.primary : theme.borderStrong,
              backgroundColor: selected ? theme.primary : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {selected ? (
              <AppIcon name="checkmark" size={13} color={theme.textOnAccent} />
            ) : null}
          </View>

          {icon ? (
            <AppIcon
              name={icon}
              size={18}
              color={selected ? theme.primary : theme.textTertiary}
            />
          ) : null}

          <View style={{ flex: 1 }}>
            <ThemedText
              variant="headline"
              style={{ color: selected ? theme.primary : theme.textPrimary }}
            >
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                {subtitle}
              </ThemedText>
            ) : null}
          </View>

          {trailing ? (
            <ThemedText variant="caption" tone="secondary">
              {trailing}
            </ThemedText>
          ) : null}
        </View>

        {children ? (
          <View
            style={{
              marginTop: spacing.md,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.borderSubtle,
            }}
          >
            {children}
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

/* ── Payment method ─────────────────────────────────────────────────── */

export type BookingPaymentMethod = "cash" | "stripe" | "points" | "combined";

export function PaymentMethodPicker({
  value,
  onChange,
  points,
  pointsUsed,
  onPointsChange,
  cashLabel = "Cash",
  cashHint,
  cardHint,
}: {
  value: BookingPaymentMethod;
  onChange: (method: BookingPaymentMethod) => void;
  points: number;
  pointsUsed: number;
  onPointsChange: (points: number) => void;
  cashLabel?: string;
  cashHint?: string;
  cardHint?: string;
}) {
  const theme = useThemeColors();
  const [draft, setDraft] = useState(String(pointsUsed));

  useEffect(() => {
    setDraft(String(pointsUsed));
  }, [pointsUsed]);

  const pointsBody = (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
        }}
      >
        <ThemedText variant="caption" tone="secondary">
          Use points
        </ThemedText>
        <View
          style={{
            width: 112,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            paddingHorizontal: spacing.sm,
          }}
        >
          <Input
            value={draft}
            keyboardType="numeric"
            placeholder="0"
            onChangeText={(text) => {
              const digits = text.replace(/[^0-9]/g, "");
              setDraft(digits);
              onPointsChange(parseInt(digits, 10) || 0);
            }}
            placeholderTextColor={theme.textQuaternary}
            style={{
              height: 38,
              textAlign: "center",
              color: theme.textPrimary,
              fontSize: 15,
            }}
          />
        </View>
      </View>
      <ThemedText variant="footnote" tone="tertiary" style={{ marginTop: 6 }}>
        {`You have ${points} points available`}
      </ThemedText>
    </>
  );

  return (
    <View style={{ gap: spacing.sm }}>
      <BookingChoice
        selected={value === "cash"}
        onPress={() => onChange("cash")}
        icon="cash-outline"
        title={cashLabel}
        subtitle={cashHint}
      />
      <BookingChoice
        selected={value === "stripe"}
        onPress={() => onChange("stripe")}
        icon="card-outline"
        title="Card payment (prepaid)"
        subtitle={cardHint}
      />
      <BookingChoice
        selected={value === "points"}
        onPress={() => onChange("points")}
        icon="star-outline"
        title="Points (prepaid)"
        trailing={`${points} points`}
      >
        {value === "points" ? pointsBody : null}
      </BookingChoice>
      <BookingChoice
        selected={value === "combined"}
        onPress={() => onChange("combined")}
        icon="layers-outline"
        title="Combined (card + points)"
        trailing={`${points} points`}
      >
        {value === "combined" ? pointsBody : null}
      </BookingChoice>
    </View>
  );
}

/* ── Price summary & footer ─────────────────────────────────────────── */

export function BookingSummary({
  title = "Price summary",
  rows,
  totalLabel = "Total",
  total,
  note,
}: {
  title?: string;
  rows: { label: string; value: string }[];
  totalLabel?: string;
  total: string;
  note?: string;
}) {
  const theme = useThemeColors();

  return (
    <View
      style={{
        marginTop: spacing.lg,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: theme.borderSubtle,
        backgroundColor: theme.surface,
        padding: spacing.lg,
      }}
    >
      <ThemedText variant="title3">{title}</ThemedText>

      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        {rows.map((row) => (
          <View
            key={row.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: spacing.md,
            }}
          >
            <ThemedText variant="bodySm" tone="secondary">
              {row.label}
            </ThemedText>
            <ThemedText variant="bodySm" translate={false}>
              {row.value}
            </ThemedText>
          </View>
        ))}
      </View>

      <View
        style={{
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.separator,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
        }}
      >
        <ThemedText variant="headline">{totalLabel}</ThemedText>
        <ThemedText variant="numeric" translate={false}>
          {total}
        </ThemedText>
      </View>

      {note ? (
        <ThemedText variant="caption" tone="tertiary" style={{ marginTop: spacing.sm }}>
          {note}
        </ThemedText>
      ) : null}
    </View>
  );
}

/**
 * Sticky bottom bar: the running total plus the screen's confirm action.
 *
 * Sits outside `BookingScroll` so the price and the CTA stay reachable in a
 * long form, while the scroll content keeps `FOOTER_CLEARANCE` of clearance.
 */
export function BookingFooter({
  total,
  totalLabel = "Total",
  children,
}: {
  total: string;
  totalLabel?: string;
  children: React.ReactNode;
}) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.canvas,
        borderTopWidth: 1,
        borderTopColor: theme.borderSubtle,
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.sm + 2,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        shadowColor: "#06101F",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: -6 },
        elevation: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
          marginBottom: spacing.sm,
        }}
      >
        <ThemedText variant="footnote" tone="secondary">
          {totalLabel}
        </ThemedText>
        <ThemedText variant="numeric" translate={false}>
          {total}
        </ThemedText>
      </View>
      {children}
    </View>
  );
}

export function BookingFooterNote({
  text,
  icon = "shield-checkmark-outline",
}: {
  text: string;
  icon?: IconName;
}) {
  const theme = useThemeColors();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xs,
      }}
    >
      <AppIcon name={icon} size={14} color={theme.textTertiary} />
      <ThemedText
        variant="footnote"
        tone="tertiary"
        style={{ flexShrink: 1, textAlign: "center" }}
      >
        {text}
      </ThemedText>
    </View>
  );
}
