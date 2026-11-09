import * as React from "react";
import { View, ScrollView, Image } from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";

import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AutoText } from "../components/ui/AutoText";
import Input from "../components/ui/Input";
import { showAlert } from "../utils/showAlert";
import GoogleSignInButton from "../components/GoogleSignInButton";
import AppleSignInButton from "../components/AppleSignInButton";
import PrimaryButton from "../components/ui/PrimaryButton";
import ThemedText from "../components/ui/ThemedText";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const theme = useThemeColors();
  const isDark = resolvedTheme === "dark";
  const [userProfile, setUserProfile] = useState<any>(null);
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = useState(false);

  const onSignInPress = async () => {
    if (!isLoaded || loading) return;

    setLoading(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        // This could happen if more steps are required (MFA, etc.)
        console.warn("Sign in status not complete:", signInAttempt.status);
        showAlert("Inloggning", `Status: ${signInAttempt.status}`);
      }
    } catch (err: any) {
      // Don't stringify big error objects in logs as it might be intercepted by UI
      console.log("Sign in error:", err?.message || "Unknown error");

      // Extract the most descriptive error message from Clerk
      const clerkError = err?.errors?.[0];
      const errorMessage =
        clerkError?.longMessage ||
        clerkError?.message ||
        "Något gick fel. Försök igen.";

      await showAlert("Inloggningsfel", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.xxxl }}
      >
        <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
          <View style={{ width: 88, height: 88, borderRadius: radii.xl, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginBottom: spacing.md }}>
            <Image source={require("../assets/logo-transparent.png")} style={{ width: 64, height: 64 }} resizeMode="contain" accessibilityLabel="Tunisiska Mega Transport" />
          </View>
          <ThemedText variant="title1" style={{ textAlign: "center" }}>Welcome back</ThemedText>
          <ThemedText variant="bodySm" tone="secondary" style={{ textAlign: "center", marginTop: spacing.xs }}>Your journey starts here</ThemedText>
          <ThemedText variant="caption" tone="tertiary" style={{ textAlign: "center", marginTop: spacing.xs }}>Sign in to manage trips, shipments and points.</ThemedText>
        </View>

        <ThemedText variant="caption" style={{ marginBottom: spacing.xs }}>Email address</ThemedText>
        <Input
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="name@example.com"
          autoCorrect={false}
          autoCapitalize="none"
          style={{ height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: spacing.md, color: theme.textPrimary, marginBottom: spacing.md }}
        />

        <ThemedText variant="caption" style={{ marginBottom: spacing.xs }}>Password</ThemedText>
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          isPassword={true}
          style={{ height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: spacing.md, color: theme.textPrimary, marginBottom: spacing.sm }}
        />

        <PrimaryButton label="Sign in" onPress={onSignInPress} loading={loading} disabled={!emailAddress.trim() || !password} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.lg }}>
          <View style={{ height: 1, flex: 1, backgroundColor: theme.separator }} />
          <ThemedText variant="overline" tone="tertiary">OR CONTINUE WITH</ThemedText>
          <View style={{ height: 1, flex: 1, backgroundColor: theme.separator }} />
        </View>

        {!userProfile ? (
          <>
            <GoogleSignInButton
              setUserProfile={setUserProfile}
              autoText={AutoText}
              forceDark={false}
            />
            <View className="h-3" />
            <AppleSignInButton
              setUserProfile={setUserProfile}
              forceDark={false}
            />
          </>
        ) : (
          <View className="items-center">
            <Image
              source={{ uri: userProfile.imageUrl }}
              className="w-20 h-20 rounded-full mb-4"
            />
            <AutoText className="text-lg font-bold">
              {userProfile.firstName} {userProfile.lastName}
            </AutoText>
            <AutoText>{userProfile.email}</AutoText>
            <AutoText>
              {userProfile.city}, {userProfile.country}
            </AutoText>
          </View>
        )}

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.lg, gap: spacing.xs }}>
          <ThemedText variant="bodySm" tone="secondary">New to Tunisiska?</ThemedText>
          <Link href="/sign-up">
            <ThemedText variant="bodySm" style={{ color: theme.accent, fontWeight: "700" }}>Create account</ThemedText>
          </Link>
        </View>
        <StatusBar style={isDark ? "light" : "dark"} />
      </ScrollView>
    </View>
  );
}
