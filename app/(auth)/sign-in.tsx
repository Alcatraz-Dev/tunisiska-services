import * as React from "react";
import { TouchableOpacity, View, ScrollView, Image, Alert } from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AutoText } from "../components/ui/AutoText";
import Input from "../components/ui/Input";
import { LinearGradient } from "expo-linear-gradient";
import { getPremiumGradient } from "../utils/getPremiumGradient";
import { showAlert } from "../utils/showAlert";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [userProfile, setUserProfile] = useState<any>(null);
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");

  const onSignInPress = async () => {
    if (!isLoaded) return;
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });
      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      const errorMessage =
        err?.errors?.[0]?.message || "Något gick fel. Försök igen."; // fallback in Swedish
        showAlert("Error", errorMessage);
    
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

  return (
    <LinearGradient
      colors={getPremiumGradient() as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        className="flex-1 px-6 pt-12"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <AutoText
          className={`text-3xl font-bold mb-6 text-center ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Logga in
        </AutoText>

        <Input
          value={emailAddress}
          onChangeText={setEmailAddress}
          placeholder="Ange e-postadress"
          placeholderTextColor={isDark ? "gray" : "gray"}
          autoCorrect={false}
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

        <TouchableOpacity className={buttonStyle} onPress={onSignInPress}>
          <AutoText className={buttonTextStyle}>Fortsätt</AutoText>
        </TouchableOpacity>

        <View
          className={`flex-row justify-center my-4 border ${
            isDark ? "border-zinc-600" : "border-zinc-300"
          }`}
        />

        {!userProfile ? (
          <GoogleSignInButton
            setUserProfile={setUserProfile}
            autoText={AutoText}
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
            Har du inget konto ?
          </AutoText>
          <Link href="/sign-up">
            <AutoText className="text-blue-500 font-semibold">
              Skapa konto
            </AutoText>
          </Link>
        </View>
        <StatusBar style={isDark ? "light" : "dark"} />
      </ScrollView>
    </LinearGradient>
  );
}
