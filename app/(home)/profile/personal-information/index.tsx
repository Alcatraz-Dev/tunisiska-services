import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, View } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import Input from "@/app/components/ui/Input";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import PressableScale from "@/app/components/ui/PressableScale";
import ScreenHeader from "@/app/components/ui/ScreenHeader";
import ThemedText from "@/app/components/ui/ThemedText";
import AppIcon from "@/app/components/ui/AppIcon";
import RedirectIfSignedOut from "@/app/components/RedirectIfSignedOut";
import { useTheme } from "@/app/context/ThemeContext";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";
import { showAlert } from "@/app/utils/showAlert";

type Fields = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

const emptyFields: Fields = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
};

export default function PersonalInformation() {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const colors = useThemeColors();
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [savedFields, setSavedFields] = useState<Fields>(emptyFields);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const metadata = user.unsafeMetadata as Record<string, unknown>;
    const profile: Fields = {
      firstName: String(metadata.firstName ?? user.firstName ?? ""),
      lastName: String(metadata.lastName ?? user.lastName ?? ""),
      phoneNumber: String(metadata.phoneNumber ?? ""),
      address: String(metadata.address ?? ""),
      city: String(metadata.city ?? ""),
      postalCode: String(metadata.postalCode ?? ""),
      country: String(metadata.country ?? ""),
    };
    setFields(profile);
    setSavedFields(profile);
  }, [isLoaded, user]);

  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? "";
  const avatarUri = String((user?.unsafeMetadata as Record<string, unknown> | undefined)?.imageUrl ?? user?.imageUrl ?? "");
  const initials = useMemo(() => {
    const name = `${fields.firstName.slice(0, 1)}${fields.lastName.slice(0, 1)}`.trim();
    return name ? name.toLocaleUpperCase() : (email.slice(0, 1).toLocaleUpperCase() || "T");
  }, [fields.firstName, fields.lastName, email]);

  const setField = (key: keyof Fields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  const handleCancel = () => {
    setFields(savedFields);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!user) return;
    const next = {
      ...fields,
      firstName: fields.firstName.trim(),
      lastName: fields.lastName.trim(),
      phoneNumber: fields.phoneNumber.trim(),
      address: fields.address.trim(),
      city: fields.city.trim(),
      postalCode: fields.postalCode.trim(),
      country: fields.country.trim(),
    };

    setSaving(true);
    try {
      await user.update({
        firstName: next.firstName,
        lastName: next.lastName,
        unsafeMetadata: { ...user.unsafeMetadata, ...next },
      });
      await user.reload();
      setFields(next);
      setSavedFields(next);
      setEditing(false);
      showAlert("Saved", "Your account details have been updated.");
    } catch (error) {
      console.error("Could not update profile information:", error);
      showAlert("Could not save changes", "Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" }}>
        <RedirectIfSignedOut />
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const field = (key: keyof Fields, label: string, placeholder: string, keyboardType?: "default" | "phone-pad" | "numeric") => (
    <View key={key} style={{ gap: spacing.xs }}>
      <ThemedText variant="caption" tone="secondary">{label}</ThemedText>
      {editing ? (
        <Input
          value={fields[key]}
          onChangeText={(value) => setField(key, value)}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize={key === "firstName" || key === "lastName" || key === "city" ? "words" : "sentences"}
          style={{ minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary }}
        />
      ) : (
        <ThemedText variant="bodySm" translate={Boolean(fields[key])} style={{ minHeight: 24, paddingVertical: 3 }}>
          {fields[key] || "Not provided"}
        </ThemedText>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <RedirectIfSignedOut />
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScreenHeader title="Personal information" subtitle="Manage your account details" showBack />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 48, gap: spacing.md }}>
        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, padding: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 58, height: 58, borderRadius: 20 }} accessibilityIgnoresInvertColors />
          ) : (
            <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <ThemedText variant="title3" color={colors.primary}>{initials}</ThemedText>
            </View>
          )}
          <View style={{ flex: 1, gap: 3 }}>
            <ThemedText variant="headline">{`${fields.firstName} ${fields.lastName}`.trim() || "Your account"}</ThemedText>
            <ThemedText variant="caption" tone="secondary" translate={false} numberOfLines={1}>{email}</ThemedText>
          </View>
          {!editing ? (
            <PressableScale onPress={() => setEditing(true)} haptic="light" accessibilityLabel="Edit profile information" style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <AppIcon name="create-outline" size={19} color={colors.primary} />
            </PressableScale>
          ) : null}
        </View>

        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.lg }}>
          <ThemedText variant="title3">Personal details</ThemedText>
          {field("firstName", "First name", "Enter first name")}
          {field("lastName", "Last name", "Enter last name")}
          <View style={{ gap: spacing.xs }}>
            <ThemedText variant="caption" tone="secondary">Email address</ThemedText>
            <View style={{ minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, justifyContent: "center" }}>
              <ThemedText variant="bodySm" translate={false} numberOfLines={1}>{email}</ThemedText>
            </View>
            <ThemedText variant="caption" tone="tertiary">To change your email, use the email verification settings.</ThemedText>
          </View>
          {field("phoneNumber", "Phone number", "Enter phone number", "phone-pad")}
        </View>

        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.lg }}>
          <ThemedText variant="title3">Address</ThemedText>
          {field("address", "Street address", "Enter street address")}
          {field("city", "City", "Enter city")}
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>{field("postalCode", "Postal code", "Postal code", "numeric")}</View>
            <View style={{ flex: 1 }}>{field("country", "Country", "Country")}</View>
          </View>
        </View>

        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, padding: spacing.lg }}>
          <ThemedText variant="title3" style={{ marginBottom: spacing.sm }}>Account security</ThemedText>
          {[
            { title: "Change password", icon: "lock-closed-outline" as const, route: "/(home)/profile/personal-information/update-password" },
            { title: "Add or verify email", icon: "mail-outline" as const, route: "/(home)/profile/personal-information/add-new-email" },
          ].map((item, index) => (
            <PressableScale key={item.title} onPress={() => router.push(item.route as any)} haptic="light" accessibilityRole="button" style={{ minHeight: 54, flexDirection: "row", alignItems: "center", gap: spacing.md, borderBottomWidth: index === 0 ? 1 : 0, borderColor: colors.borderSubtle }}>
              <AppIcon name={item.icon} size={19} color={colors.primary} />
              <ThemedText variant="bodySm" style={{ flex: 1 }}>{item.title}</ThemedText>
              <AppIcon name="chevron-forward" size={16} color={colors.textQuaternary} />
            </PressableScale>
          ))}
        </View>

        {editing ? (
          <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
            <PrimaryButton label={saving ? "Saving…" : "Save changes"} onPress={handleSave} loading={saving} />
            <PrimaryButton label="Cancel" variant="secondary" onPress={handleCancel} disabled={saving} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
