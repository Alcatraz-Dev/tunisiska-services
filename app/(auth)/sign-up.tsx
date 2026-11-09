import * as React from "react";
import { View, ScrollView, Image } from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { OtpInput } from "react-native-otp-entry";
import { AutoText } from "../components/ui/AutoText";
import Input from "../components/ui/Input";
import { showAlert } from "../utils/showAlert";
import GoogleSignInButton from "../components/GoogleSignInButton";
import AppleSignInButton from "../components/AppleSignInButton";
import { nativeNotifyAPI } from "../services/nativeNotifyApi";
import { useUser } from "@clerk/clerk-expo";
import PrimaryButton from "../components/ui/PrimaryButton";
import ThemedText from "../components/ui/ThemedText";
import { useThemeColors } from "@/app/theme";
import { radii, spacing } from "@/app/theme/spacing";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { user } = useUser();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const theme = useThemeColors();
  const isDark = resolvedTheme === "dark";

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const onSignUpPress = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      console.log("Sign up error:", err?.message || "Unknown error");
      const clerkError = err?.errors?.[0];
      const errorMessage =
        clerkError?.longMessage ||
        clerkError?.message ||
        "Något gick fel. Försök igen.";
      await showAlert("Fel vid registrering", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });
      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });

        // Send welcome notification to new user
        if (user?.id) {
          try {
            const result = await nativeNotifyAPI.sendNotification({
              title: "Välkommen till Tunisiska Mega Service !",
              message: "Tack för att du registrerade dig! Utforska våra tjänster och börja boka.",
              subID: user.id,
              pushData: {
                type: "welcome",
                userId: user.id,
                timestamp: new Date().toISOString(),
              }
            });
            console.log("✅ Welcome notification result:", result);
            if (result.success) {
              console.log("✅ Welcome notification sent to new user:", user.id);
            } else {
              console.warn("⚠️ Welcome notification failed:", result.error);
            }
          } catch (error) {
            console.warn("⚠️ Failed to send welcome notification:", error);
          }
        }

        router.replace("/");
      } else {
        console.warn("Sign up verification not complete:", signUpAttempt.status);
        await showAlert("Verifiering", `Status: ${signUpAttempt.status}`);
      }
    } catch (err: any) {
      console.log("Verification error:", err?.message || "Unknown error");
      const clerkError = err?.errors?.[0];
      const errorMessage =
        clerkError?.longMessage ||
        clerkError?.message ||
        "Något gick fel. Försök igen.";

      await showAlert("Fel vid verifiering", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: spacing.xl, backgroundColor: theme.canvas }}>
        <ThemedText variant="title1" style={{ marginBottom: spacing.sm }}>Verify your email</ThemedText>
        <ThemedText variant="bodySm" tone="secondary" style={{ marginBottom: spacing.xl }}>Enter the code sent to your email address.</ThemedText>

        {/* OTP Input instead of TextInput */}
        <OtpInput
          numberOfDigits={6}
          onTextChange={setCode}
          focusColor={theme.primary}
          theme={{
            pinCodeContainerStyle: {
              borderColor: theme.border,
              backgroundColor: theme.surface,
              borderRadius: radii.md,
            },
            pinCodeTextStyle: {
              fontSize: 18,
              color: theme.textPrimary,
            },
          }}
        />

        {/* Verify button */}
        <PrimaryButton label="Verify email" onPress={onVerifyPress} loading={loading} disabled={code.length < 6} style={{ marginTop: spacing.xl }} />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.xxxl }}
      >
        <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
          <View style={{ width: 88, height: 88, borderRadius: radii.xl, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginBottom: spacing.md }}>
            <Image source={require("../assets/logo-transparent.png")} style={{ width: 64, height: 64 }} resizeMode="contain" accessibilityLabel="Tunisiska Mega Transport" />
          </View>
          <ThemedText variant="title1" style={{ textAlign: "center" }}>Create account</ThemedText>
          <ThemedText variant="bodySm" tone="secondary" style={{ textAlign: "center", marginTop: spacing.xs }}>A few details to get started</ThemedText>
          <ThemedText variant="caption" tone="tertiary" style={{ textAlign: "center", marginTop: spacing.xs }}>Set up your account to book transport and follow every journey.</ThemedText>
        </View>

        <ThemedText variant="caption" style={{ marginBottom: spacing.xs }}>Email address</ThemedText>
        <Input
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="name@example.com"
          autoCapitalize="none"
          style={{ height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: spacing.md, color: theme.textPrimary, marginBottom: spacing.md }}
        />

        <ThemedText variant="caption" style={{ marginBottom: spacing.xs }}>Password</ThemedText>
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          isPassword={true}
          style={{ height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: spacing.md, color: theme.textPrimary, marginBottom: spacing.md }}
        />

        <PrimaryButton label="Create account" onPress={onSignUpPress} loading={loading} disabled={!emailAddress.trim() || password.length < 8} />

        {/* Extra breathing room for the policy note below the primary action. */}
        <View style={{ marginTop: spacing.sm }} />

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.md, marginBottom: spacing.md }}>
          <ThemedText variant="footnote" tone="tertiary">By continuing, you agree to our Terms and Privacy Policy.</ThemedText>
        </View>

        {!userProfile ? (
          <>
            <GoogleSignInButton
              setUserProfile={setUserProfile}
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
          <ThemedText variant="bodySm" tone="secondary">Already have an account?</ThemedText>
          <Link href="/sign-in">
            <ThemedText variant="bodySm" style={{ color: theme.accent, fontWeight: "700" }}>Sign in</ThemedText>
          </Link>
        </View>
        <StatusBar style={isDark ? "light" : "dark"} />
      </ScrollView>
    </View>
  );
}
