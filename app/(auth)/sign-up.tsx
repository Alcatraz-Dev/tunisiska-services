import * as React from "react";
import { TouchableOpacity, View, ScrollView, Image, Alert } from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { OtpInput } from "react-native-otp-entry";
import { AutoText } from "../components/ui/AutoText";
import Input from "../components/ui/Input";
import { LinearGradient } from "expo-linear-gradient";
import { getPremiumGradient } from "../utils/getPremiumGradient";
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

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    try {
      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      // Clerk returns structured errors
      const errorMessage =
        err?.errors?.[0]?.message || "Något gick fel. Försök igen."; // fallback in Swedish
      showAlert("Fel vid registrering", errorMessage);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;
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
        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      const errorMessage =
        err?.errors?.[0]?.message || "Något gick fel. Försök igen."; // fallback in Swedish

      showAlert("Fel vid verifiering", errorMessage);
    }
  };

  const inputStyle = `w-full p-4 rounded-xl border mb-4 ${
    isDark
      ? "border-gray-700 bg-dark-card text-white"
      : "border-gray-300 bg-white text-gray-900"
  }`;

  const buttonStyle = `w-full p-4 rounded-xl items-center ${
    isDark ? "bg-blue-600" : "bg-blue-500"
  }`;

  const buttonTextStyle = "text-white font-semibold";

  if (pendingVerification) {
    return (
      <View
        className={`flex-1 justify-center px-6 ${
          isDark ? "bg-dark" : "bg-light"
        }`}
      >
        {/* Header */}
        <AutoText
          className={`text-2xl font-bold mb-4 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Verifiera din e-post
        </AutoText>
        <AutoText
          className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}
        >
          Ange koden som skickades till din e-post
        </AutoText>

        {/* OTP Input instead of TextInput */}
        <OtpInput
          numberOfDigits={6}
          onTextChange={setCode}
          focusColor={isDark ? "#60A5FA" : "#3B82F6"}
          theme={{
            pinCodeContainerStyle: {
              borderColor: isDark ? "#374151" : "#D1D5DB",
              backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
              borderRadius: 12,
            },
            pinCodeTextStyle: {
              fontSize: 18,
              color: isDark ? "#F9FAFB" : "#111827",
            },
          }}
        />

        {/* Verify button */}
        <TouchableOpacity
          className={`${buttonStyle} mt-6`}
          onPress={onVerifyPress}
          disabled={code.length < 6}
        >
          <AutoText className={buttonTextStyle}>Verifiera</AutoText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={getPremiumGradient() as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        className={`flex-1 px-6 pt-12 `}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <AutoText
          className={`text-3xl font-bold mb-6 text-center ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Skapa konto
        </AutoText>

        <Input
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="Ange e-postadress"
          placeholderTextColor={isDark ? "gray" : "gray"}
          autoCapitalize="none"
          className={inputStyle}
        />

        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Ange lösenord"
          placeholderTextColor={isDark ? "gray" : "gray"}
          secureTextEntry
          className={inputStyle}
        />

        <TouchableOpacity className={buttonStyle} onPress={onSignUpPress}>
          <AutoText className={buttonTextStyle}>Fortsätt</AutoText>
        </TouchableOpacity>
        <View
          className={`flex-row justify-center my-4 border ${
            isDark ? "border-zinc-600" : "border-zinc-300"
          }`}
        ></View>
        {!userProfile ? (
          <GoogleSignInButton
            setUserProfile={setUserProfile}
            // autoText={AutoText}
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
          <AutoText className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Har du redan ett konto ?
          </AutoText>
          <Link href="/sign-in">
            <AutoText className="text-blue-500 font-semibold">
              Logga in
            </AutoText>
          </Link>
        </View>
        <StatusBar style={isDark ? "light" : "dark"} />
      </ScrollView>
    </LinearGradient>
  );
}
