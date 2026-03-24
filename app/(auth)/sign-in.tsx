import * as React from "react";
import { TouchableOpacity, View, ScrollView, Image, Alert, ActivityIndicator } from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";

import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AutoText } from "../components/ui/AutoText";
import Input from "../components/ui/Input";
import { showAlert } from "../utils/showAlert";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
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

  const inputStyle = `w-full p-4 rounded-xl border mb-4 border-gray-700 bg-dark-card text-white`;

  const buttonStyle = `w-full p-4 rounded-xl items-center bg-blue-600`;

  const buttonTextStyle = "text-white font-semibold";

  return (
    <View className="flex-1 bg-dark">
      <ScrollView
        className="flex-1 px-6 pt-12"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <AutoText
          className="text-3xl font-bold mb-6 text-center text-white"
        >
          Logga in
        </AutoText>

        <Input
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="Ange e-postadress"
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
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
          onPress={onSignInPress}
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
        />

        {!userProfile ? (
          <GoogleSignInButton
            setUserProfile={setUserProfile}
            autoText={AutoText}
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
            Har du inget konto ?
          </AutoText>
          <Link href="/sign-up">
            <AutoText className="text-blue-500 font-semibold">
              Skapa konto
            </AutoText>
          </Link>
        </View>
        <StatusBar style="light" />
      </ScrollView>
    </View>
  );
}
