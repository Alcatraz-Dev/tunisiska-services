import * as React from "react";
import { TouchableOpacity, View, ScrollView, Image, Alert, ActivityIndicator } from "react-native";
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
import { nativeNotifyAPI } from "../services/nativeNotifyApi";
import { useUser } from "@clerk/clerk-expo";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { user } = useUser();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
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

  const inputStyle = `w-full p-4 rounded-xl border mb-4 border-gray-700 bg-dark-card text-white`;

  const buttonStyle = `w-full p-4 rounded-xl items-center bg-blue-600`;

  const buttonTextStyle = "text-white font-semibold";

  if (pendingVerification) {
    return (
      <View
        className="flex-1 justify-center px-6 bg-dark"
      >
        {/* Header */}
        <AutoText
          className="text-2xl font-bold mb-4 text-white"
        >
          Verifiera din e-post
        </AutoText>
        <AutoText
          className="mb-6 text-gray-400"
        >
          Ange koden som skickades till din e-post
        </AutoText>

        {/* OTP Input instead of TextInput */}
        <OtpInput
          numberOfDigits={6}
          onTextChange={setCode}
          focusColor="#60A5FA"
          theme={{
            pinCodeContainerStyle: {
              borderColor: "#374151",
              backgroundColor: "#1F2937",
              borderRadius: 12,
            },
            pinCodeTextStyle: {
              fontSize: 18,
              color: "#F9FAFB",
            },
          }}
        />

        {/* Verify button */}
        <TouchableOpacity
          className={`${buttonStyle} mt-6 ${loading ? 'opacity-70' : ''}`}
          onPress={onVerifyPress}
          disabled={code.length < 6 || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <AutoText className={buttonTextStyle}>Verifiera</AutoText>
          )}
        </TouchableOpacity>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-dark">
      <ScrollView
        className={`flex-1 px-6 pt-12 `}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <AutoText
          className="text-3xl font-bold mb-6 text-center text-white"
        >
          Skapa konto
        </AutoText>

        <Input
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="Ange e-postadress"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          className={inputStyle}
          style={{ color: "#FFFFFF" }}
        />

        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Ange lösenord"
          placeholderTextColor="#9CA3AF"
          isPassword={true}
          className={inputStyle}
          style={{ color: "#FFFFFF" }}
        />

        <TouchableOpacity
          className={`${buttonStyle} ${loading ? 'opacity-70' : ''}`}
          onPress={onSignUpPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <AutoText className={buttonTextStyle}>Fortsätt</AutoText>
          )}
        </TouchableOpacity>
        <View
          className="flex-row justify-center my-4 border border-zinc-600"
        ></View>
        {!userProfile ? (
          <GoogleSignInButton
            setUserProfile={setUserProfile}
            forceDark={false}
          />
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

        <View className="flex-row justify-center mt-4 gap-2">
          <AutoText className="text-gray-400">
            Har du redan ett konto ?
          </AutoText>
          <Link href="/sign-in">
            <AutoText className="text-blue-500 font-semibold">
              Logga in
            </AutoText>
          </Link>
        </View>
        <StatusBar style="light" />
      </ScrollView>
    </View>
  );
}
