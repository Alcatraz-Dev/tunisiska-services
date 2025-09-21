import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SignedIn, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import icons from "@/app/constants/icons";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { useLanguage } from "@/app/hooks/useLanguage";
import { showAlert } from "@/app/utils/showAlert";


// Interface for user profile data

interface Referral {
  email: string;
  name: string;
  points: number;
  referredBy: string;
}
interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country: string;
  imageUrl?: string;
  membershipTier: string;
  shipmentsCompleted: number;
  ongoingShipments: number;
  points: number;
  defaultLanguage: string;
  referralCode: string;
  signUpMethod: "google" | "email";
  googleProfile?: {
    givenName?: string;
    familyName?: string;
    picture?: string;
    locale?: string;
  };
  givenName?: string;
  familyName?: string;
  picture?: string;
  locale?: string;
  referrals?: Referral[];
  referredBy?: string;
}

const PersonalInformation = () => {
  const { isLoaded, user } = useUser();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const isDark = resolvedTheme === "dark";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Sverige"); // default country
  const [imageUrl, setImageUrl] = useState("");
  const [referralBy, setReferralBy] = useState("");
  const [referralSet, setReferralSet] = useState(false);
  const { language } = useLanguage();
  // Load user profile data
  useEffect(() => {
    if (!isLoaded || !user) return;

    const existingReferral = user.unsafeMetadata?.referralBy || "";
    if (existingReferral) {
      setReferralBy(existingReferral as string);
      setReferralSet(true);
    }
    const profileData = {
      firstName: user.unsafeMetadata?.firstName || "",
      lastName: user.unsafeMetadata?.lastName || "",
      email: user.emailAddresses[0]?.emailAddress || "",
      phoneNumber: user.unsafeMetadata?.phoneNumber || "",
      address: user.unsafeMetadata?.address || "",
      city: user.unsafeMetadata?.city || "",
      postalCode: user.unsafeMetadata?.postalCode || "",
      country: user.unsafeMetadata?.country || "Sverige",
      imageUrl: user.unsafeMetadata?.imageUrl || user?.imageUrl,
      referralCode: user.unsafeMetadata?.referralCode || "",
      referredBy: user.unsafeMetadata?.referredBy || "",
      referrals: user.unsafeMetadata?.referrals || [],
      points: user.unsafeMetadata?.points || 0,
      defaultLanguage: user.unsafeMetadata?.defaultLanguage || "sv",
      membershipTier: user.unsafeMetadata?.membershipTier || "Standardmedlem",
      shipmentsCompleted: user.unsafeMetadata?.shipmentsCompleted || 0,
      ongoingShipments: user.unsafeMetadata?.ongoingShipments || 0,
      signUpMethod: user.unsafeMetadata?.signUpMethod || "",
      joinedAt: user.unsafeMetadata?.joinedAt || "",
      lastRewardDate: user.unsafeMetadata?.lastRewardDate || "",
      streak: user.unsafeMetadata?.streak || 0,
      transactions: user.unsafeMetadata?.transactions || [],
    };

    setFirstName(profileData.firstName as string);
    setLastName(profileData.lastName as string);
    setEmail(profileData.email);
    setPhoneNumber(profileData.phoneNumber as string);
    setAddress(profileData.address as string);
    setCity(profileData.city as string);
    setPostalCode(profileData.postalCode as string);
    setCountry(profileData.country as string);
    setImageUrl(profileData.imageUrl as string);

    setUserProfile(profileData as any as UserProfileData);

    setLoading(false);
  }, [isLoaded, user]);
  const pickImage = async () => {
    // Ask for permission
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert(
        "Tillstånd behövs",
        "Geåtkomst till bilder för attändra profilbild"
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      // Here you should upload the image to a server/storage and get the URL
      // For demonstration, we'll just use the local uri
      setImageUrl(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const updatedMetadata = {
        ...user.unsafeMetadata, // merge existing
        firstName,
        lastName,
        phoneNumber,
        address,
        city,
        postalCode,
        country,
        imageUrl,
      };

      await user.update({ unsafeMetadata: updatedMetadata });
      await user.reload();

      setUserProfile({
        ...userProfile!,
        firstName,
        lastName,
        phoneNumber,
        address,
        city,
        postalCode,
        country,
        imageUrl,
      });

      await showAlert("Success", "Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);

      await showAlert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (userProfile) {
      setFirstName(userProfile.firstName);
      setLastName(userProfile.lastName);
      setPhoneNumber(userProfile.phoneNumber || "");
      setAddress(userProfile.address || "");
      setCity(userProfile.city || "");
      setPostalCode(userProfile.postalCode || "");
      setCountry(userProfile.country);
    }
    setIsEditing(false);
  };

  // Show loading state while user data is being fetched
  if (!isLoaded || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-dark">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <AutoText className="mt-4 text-gray-600 dark:text-gray-400">
          Laddar profil...
        </AutoText>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <SignedIn>
        {/* Header */}
        <View className={`px-6 pb-6 pt-16 ${isDark ? "bg-dark" : "bg-light"}`}>
          <View className="flex-row items-center justify-center mb-6 mt-5 relative">
            {/* Back Button */}
            <View className="absolute left-0">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center"
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={isDark ? "#fff" : "#000"}
                />
              </TouchableOpacity>
            </View>

            {/* Centered Title */}
            <AutoText
              className={`text-xl font-extrabold text-center tracking-tighter ${
                isDark ? "text-white" : "text-gray-900"
              } `}
            >
              Personlig Information
            </AutoText>
          </View>
          <AutoText
            className={`text-sm text-center mb-4 ${
              isDark ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Redigera dina personliga uppgifter
          </AutoText>
        </View>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Edit/Save Button */}
          <View className="flex-row items-end mr-4 mt-4 justify-end">
            {isEditing ? (
              <View className="flex-row space-x-2 gap-2 ">
                <TouchableOpacity onPress={handleCancel}>
                  <AutoText className="text-red-500 font-medium">
                    Avbryt
                  </AutoText>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#3B82F6" />
                  ) : (
                    <AutoText className="text-blue-500 font-medium">
                      Spara
                    </AutoText>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <AutoText className="text-blue-500 font-medium">
                  Redigera
                </AutoText>
              </TouchableOpacity>
            )}
          </View>

          {/* Profile Image */}
          <View className="items-center mt-6 px-6">
            <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4 overflow-hidden">
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl || userProfile?.imageUrl }}
                  className={`w-20 h-20 rounded-full border my-3 ${
                    isDark ? "border-gray-200" : "border-gray-700"
                  }`}
                />
              ) : (
                <Ionicons name="person" size={32} color="#0ea5e9" />
              )}
            </View>
            {isEditing && (
              <TouchableOpacity className="mt-2" onPress={pickImage}>
                <AutoText className="text-blue-500 text-sm">
                  Ändra bild
                </AutoText>
              </TouchableOpacity>
            )}
          </View>
          {/* Personal Information Form */}
          <View className="px-6 mt-6">
            <View
              className={`rounded-2xl p-6 shadow-sm ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              <AutoText
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Grundinformation
              </AutoText>

              <View className="space-y-4">
                <View>
                  <AutoText
                    className={`text-sm font-medium mb-2 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Förnamn
                  </AutoText>
                  {isEditing ? (
                    <Input
                      className={`rounded-lg px-4 py-3 my-2 ${
                        isDark
                          ? "bg-zinc-700 text-white"
                          : "bg-white text-gray-900"
                      } border ${
                        isDark ? "border-gray-600" : "border-gray-300"
                      }`}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Förnamn"
                      placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                  ) : (
                    <>
                      <AutoText
                        className={`text-base ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {firstName || "Ej angivet"}
                      </AutoText>
                      <View
                        className={`h-0.5 my-2 ${
                          isDark ? "bg-zinc-700" : "bg-zinc-200"
                        }`}
                      ></View>
                    </>
                  )}
                </View>

                <View>
                  <AutoText
                    className={`text-sm font-medium mb-2 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Efternamn
                  </AutoText>
                  {isEditing ? (
                    <Input
                      className={`rounded-lg px-4 py-3 my-2 ${
                        isDark
                          ? "bg-zinc-700 text-white"
                          : "bg-white text-gray-900"
                      } border ${
                        isDark ? "border-gray-600" : "border-gray-300"
                      }`}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Efternamn"
                      placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                  ) : (
                    <>
                      <AutoText
                        className={`text-base ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {lastName || "Ej angivet"}
                      </AutoText>
                      <View
                        className={`h-0.5 my-2 ${
                          isDark ? "bg-zinc-700" : "bg-zinc-200"
                        }`}
                      ></View>
                    </>
                  )}
                </View>

                <View>
                  <AutoText
                    className={`text-sm font-medium my-2 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    E-post
                  </AutoText>
                  <AutoText
                    className={`text-base mb-1 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {email}
                  </AutoText>
                  <AutoText
                    className={`text-xs mt-1 ${
                      isDark ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    E-postadressen kan inte ändras här
                  </AutoText>
                  <View
                    className={`h-0.5 my-2 ${
                      isDark ? "bg-zinc-700" : "bg-zinc-200"
                    }`}
                  ></View>
                </View>

                <View>
                  <AutoText
                    className={`text-sm font-medium mb-2 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Telefonnummer
                  </AutoText>
                  {isEditing ? (
                    <Input
                      className={`rounded-lg px-4 py-3 ${
                        isDark
                          ? "bg-zinc-700 text-white"
                          : "bg-white text-gray-900"
                      } border ${
                        isDark ? "border-gray-600" : "border-gray-300"
                      }`}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="Telefonnummer"
                      placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                      keyboardType="phone-pad"
                    />
                  ) : (
                    <AutoText
                      className={`text-base ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {phoneNumber}
                    </AutoText>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Address Information */}
          <View className="px-6 mt-6">
            <View
              className={`rounded-2xl p-6 shadow-sm ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              <AutoText
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Adressinformation
              </AutoText>

              <View className="space-y-4">
                <View>
                  <AutoText
                    className={`text-sm font-medium mb-2 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Adress
                  </AutoText>
                  {isEditing ? (
                    <Input
                      className={`rounded-lg px-4 py-3 my-2 ${
                        isDark
                          ? "bg-zinc-700 text-white"
                          : "bg-white text-gray-900"
                      } border ${
                        isDark ? "border-gray-600" : "border-gray-300"
                      }`}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Gatuadress"
                      placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                  ) : (
                    <>
                      <AutoText
                        className={`text-base ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {address || "Ej angivet"}
                      </AutoText>
                      <View
                        className={`h-0.5 my-2 ${
                          isDark ? "bg-zinc-700" : "bg-zinc-200"
                        }`}
                      ></View>
                    </>
                  )}
                </View>

                <View className="flex-row space-x-4 gap-3">
                  <View className="flex-1">
                    <AutoText
                      className={`text-sm font-medium mb-2 my-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Postnummer
                    </AutoText>
                    {isEditing ? (
                      <Input
                        className={`rounded-lg px-4 py-3 my-2 ${
                          isDark
                            ? "bg-zinc-700 text-white"
                            : "bg-white text-gray-900"
                        } border ${
                          isDark ? "border-gray-600" : "border-gray-300"
                        }`}
                        value={postalCode}
                        onChangeText={setPostalCode}
                        placeholder="Postnummer"
                        placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                        keyboardType="numeric"
                      />
                    ) : (
                      <>
                        <AutoText
                          className={`text-base ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {postalCode || "Ej angivet"}
                        </AutoText>
                        <View
                          className={`h-0.5 my-2 ${
                            isDark ? "bg-zinc-700" : "bg-zinc-200"
                          }`}
                        ></View>
                      </>
                    )}
                  </View>

                  <View className="flex-1">
                    <AutoText
                      className={`text-sm font-medium mb-2 my-1 ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Stad
                    </AutoText>
                    {isEditing ? (
                      <Input
                        className={`rounded-lg px-4 py-3 my-2 ${
                          isDark
                            ? "bg-zinc-700 text-white"
                            : "bg-white text-gray-900"
                        } border ${
                          isDark ? "border-gray-600" : "border-gray-300"
                        }`}
                        value={city}
                        onChangeText={setCity}
                        placeholder="Stad"
                        placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                      />
                    ) : (
                      <>
                        <AutoText
                          className={`text-base ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {city || "Ej angivet"}
                        </AutoText>
                        <View
                          className={`h-0.5 my-2 ${
                            isDark ? "bg-zinc-700" : "bg-zinc-200"
                          }`}
                        ></View>
                      </>
                    )}
                  </View>
                </View>

                <View>
                  <AutoText
                    className={`text-sm font-medium mb-2 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Land
                  </AutoText>
                  {isEditing ? (
                    <Input
                      className={`rounded-lg px-4 py-3 ${
                        isDark
                          ? "bg-zinc-700 text-white"
                          : "bg-white text-gray-900"
                      } border ${
                        isDark ? "border-gray-600" : "border-gray-300"
                      }`}
                      value={country}
                      onChangeText={setCountry}
                      placeholder="Land"
                      placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                  ) : (
                    <AutoText
                      className={`text-base ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {country || "Sverige"}
                    </AutoText>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Account Security */}
          <View className="px-6 mt-6 mb-8">
            <View
              className={`rounded-2xl p-6 shadow-sm ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              <AutoText
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Konto säkerhet
              </AutoText>

              <TouchableOpacity
                onPress={() =>
                  router.push(
                    "/(home)/profile/personal-information/update-password"
                  )
                }
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center">
                  <Image
                    source={icons.lock}
                    className="w-5 h-5 mr-2"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                  <AutoText
                    className={`${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    Ändra lösenord
                  </AutoText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDark ? "#94a3b8" : "#64748b"}
                />
              </TouchableOpacity>
              <View
                className={`h-0.5 my-2 ${
                  isDark ? "bg-zinc-700" : "bg-zinc-200"
                }`}
              ></View>
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    "/(home)/profile/personal-information/add-new-email"
                  )
                }
                className="flex-row items-center justify-between py-3 "
              >
                <View className="flex-row items-center">
                  <Image
                    source={icons.mail}
                    className="w-5 h-5 mr-2"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                  <AutoText
                    className={`${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    E-postinställningar
                  </AutoText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isDark ? "#94a3b8" : "#64748b"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SignedIn>

      <StatusBar
        translucent
        backgroundColor="transparent"
        style={isDark ? "light" : "dark"}
      />
    </View>
  );
};

export default PersonalInformation;
