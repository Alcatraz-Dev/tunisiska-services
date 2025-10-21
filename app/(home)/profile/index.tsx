import LanguageRow from "@/app/components/LanguageRow";
import NotificationSettings from "@/app/components/NotificationSettings";
import RedirectIfSignedOut from "@/app/components/RedirectIfSignedOut";
import { AutoText } from "@/app/components/ui/AutoText";
import icons from "@/app/constants/icons";
import { getPremiumGradient } from "@/app/utils/getPremiumGradient";
import { showAlert } from "@/app/utils/showAlert";
import { SignedIn, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SignOutButton from "../../components/SignOutButton";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../context/ThemeContext";
import DriverToggle from "@/app/components/DriverToggle";
// Interface for user profile data
interface Referral {
  id: string;
  clerkId: string;
  name: string;
  joinedAt: string;
  status: "pending" | "completed" | "active";
  pointsEarned: number;
}
interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string;
  membershipTier: string;
  shipmentsCompleted: number;
  ongoingShipments: number;
  points: number;
  defaultLanguage: string;
  country: string;
  referralCode: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  googleProfile?: {
    givenName?: string;
    familyName?: string;
    picture?: string;
    locale?: string;
  };
  referrals?: Referral[];
  friendsCount?: number;
  signUpMethod: "google" | "email";
  isDriver?: boolean;
  isAdmin?: boolean;
}

const Profile = () => {
  const { isLoaded, user } = useUser();
  const { resolvedTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Sverige"); // default country
  const [imageUrl, setImageUrl] = useState("");
  const [isDriver, setIsDriver] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const router = useRouter();

  const totalReferrals = (userProfile?.referrals ?? []).length;
  const pendingReferrals = (userProfile?.referrals ?? []).filter(
    (r) => r.status === "pending"
  ).length;
  const activeReferrals = (userProfile?.referrals ?? []).filter(
    (r) => r.status === "active" || r.status === "completed"
  ).length;

  // Get pending friend requests count from Sanity
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);

  useEffect(() => {
    const loadPendingFriendRequests = async () => {
      if (!user?.id) return;

      try {
        const { client } = await import("@/sanityClient");
        const pendingRequests = await client.fetch(
          `count(*[_type == "friendRequest" && toUserId == $userId && status == "pending"])`,
          { userId: user.id }
        );
        setPendingFriendRequests(pendingRequests);
      } catch (error) {
        console.error("Error loading pending friend requests count:", error);
        setPendingFriendRequests(0);
      }
    };

    loadPendingFriendRequests();
  }, [user?.id]);

  // Initialize isDark early so it can be used in getTierColors
  const isDark = resolvedTheme === "dark";

  // Function to determine membership tier based on points
  const getMembershipTier = (points: number) => {
    if (points >= 50000) return "Vipmedlem";
    if (points >= 20000) return "Supermedlem";
    if (points >= 10000) return "Mastermedlem";
    if (points >= 5000) return "Diamondmedlem";
    if (points >= 2000) return "Platinummedlem";
    if (points >= 1000) return "Goldmedlem";
    if (points >= 500) return "Silvermedlem";
    return "Standardmedlem";
  };
  const totalPoints = user?.unsafeMetadata?.points || (0 as number);
  const getTierColors = (tier: string) => {
    switch (tier) {
      case "Platinummedlem":
        return {
          bg: isDark ? "bg-gray-800" : "bg-gray-100",
          text: isDark ? "text-gray-100" : "text-gray-900",
        };
      case "Goldmedlem":
        return {
          bg: isDark ? "bg-yellow-800" : "bg-yellow-200",
          text: isDark ? "text-yellow-200" : "text-yellow-900",
        };
      case "Silvermedlem":
        return {
          bg: isDark ? "bg-slate-800" : "bg-slate-200",
          text: isDark ? "text-slate-200" : "text-slate-900",
        };
      case "Diamondmedlem":
        return {
          bg: isDark ? "bg-purple-800" : "bg-purple-200",
          text: isDark ? "text-purple-200" : "text-purple-900",
        };
      case "Mastermedlem":
        return {
          bg: isDark ? "bg-pink-800" : "bg-pink-200",
          text: isDark ? "text-pink-200" : "text-pink-900",
        };
      case "Supermedlem":
        return {
          bg: isDark ? "bg-red-800" : "bg-red-200",
          text: isDark ? "text-red-200" : "text-red-900",
        };
      case "Vipmedlem":
        return {
          bg: isDark ? "bg-rose-800" : "bg-rose-200",
          text: isDark ? "text-rose-200" : "text-rose-900",
        };
      default:
        return {
          bg: isDark ? "bg-amber-400" : "bg-amber-300",
          text: isDark ? "text-amber-100" : "text-amber-800",
        };
    }
  };
  const tierColors = getTierColors(
    userProfile?.membershipTier || "Standardmedlem"
  );
  // Load user profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!isLoaded || !user) return;
      const generateReferralCode = (userId: string) => `${userId}`;

      // Get referrals from Sanity as source of truth
      let referrals = user.unsafeMetadata?.referrals || [];
      let userDoc: any = null;
      try {
        const { client } = await import("@/sanityClient");
        userDoc = await client.fetch(
          `*[_type == "users" && clerkId == $clerkId][0]`,
          { clerkId: user.id }
        );
        if (userDoc?.referrals && Array.isArray(userDoc.referrals)) {
          referrals = userDoc.referrals;
          // Sync Clerk metadata with Sanity
          if (
            JSON.stringify(user.unsafeMetadata?.referrals) !==
            JSON.stringify(referrals)
          ) {
            await user.update({
              unsafeMetadata: {
                ...user.unsafeMetadata,
                referrals: referrals,
              },
            });
          }
        }
      } catch (error) {
        console.error("Error loading referrals from Sanity:", error);
      }

      // Get friends count from Sanity (similar to friends screen logic)
      let friendsCount = 0;
      try {
        const { client } = await import("@/sanityClient");
        const friendRequests = await client.fetch(
          `*[_type == "friendRequest" && status == "accepted" && (fromUserId == $userId || toUserId == $userId)]`,
          { userId: user.id }
        );
        friendsCount = friendRequests.length;
      } catch (error) {
        console.error("Error loading friends count from Sanity:", error);
        // Fallback to metadata
        friendsCount = (user.unsafeMetadata as any)?.friends?.length || 0;
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
        imageUrl: user.unsafeMetadata?.imageUrl || "",
        referralCode: generateReferralCode(user.id),
        referrals: referrals,
        friendsCount: friendsCount,
        membershipTier: getMembershipTier((totalPoints as number) || 0),
        signUpMethod: user?.unsafeMetadata?.signUpMethod || "email",
        points: user.unsafeMetadata?.points || 0,
        shipmentsCompleted: 0, // Not used in current implementation
        ongoingShipments: 0, // Not used in current implementation
        defaultLanguage: "sv", // Default to Swedish
        isDriver: userDoc?.isDriver || false,
        isAdmin: userDoc?.isAdmin || false,
      };

      setFirstName(profileData.firstName as string);
      setLastName(profileData.lastName as string);
      setEmail(profileData.email);
      setPhoneNumber(profileData.phoneNumber as string);
      setAddress(profileData.address as string);
      setCity(profileData.city as string);
      setPostalCode(profileData.postalCode as string);
      setCountry(profileData.country as string);
      setImageUrl((user.unsafeMetadata?.imageUrl as string) || user.imageUrl);
      setReferralCode(profileData.referralCode as string);
      setIsDriver(profileData.isDriver || false);
      setUserProfile(profileData as UserProfileData);

      setLoading(false);
    };

    loadProfileData();
  }, [isLoaded, user]);

  const copyToClipboard = () => {
    showAlert("Kopierad", "Referenskoden har kopierats till urklipp!");
  };

  // Admin backup function
  const handleBackupData = async () => {
    try {
      setLoading(true);
      const { client } = await import("@/sanityClient");

      // Fetch all data from Sanity
      const [users, moveOrders, shippingOrders, taxiOrders, moveCleaningOrders, announcements, friendRequests] = await Promise.all([
        client.fetch(`*[_type == "users"]`),
        client.fetch(`*[_type == "moveOrder"]`),
        client.fetch(`*[_type == "shippingOrder"]`),
        client.fetch(`*[_type == "taxiOrder"]`),
        client.fetch(`*[_type == "moveCleaningOrder"]`),
        client.fetch(`*[_type == "announcement"]`),
        client.fetch(`*[_type == "friendRequest"]`),
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        data: {
          users,
          moveOrders,
          shippingOrders,
          taxiOrders,
          moveCleaningOrders,
          announcements,
          friendRequests,
        },
        summary: {
          usersCount: users.length,
          moveOrdersCount: moveOrders.length,
          shippingOrdersCount: shippingOrders.length,
          taxiOrdersCount: taxiOrders.length,
          moveCleaningOrdersCount: moveCleaningOrders.length,
          announcementsCount: announcements.length,
          friendRequestsCount: friendRequests.length,
        }
      };

      // Create and download .zgr file
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/octet-stream;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `sanity-backup-${new Date().toISOString().split('T')[0]}.zgr`;

      // For web platform - download file
      if (Platform.OS === 'web') {
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.style.display = 'none';
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);

        showAlert("Backup slutförd", `Backup-fil "${exportFileDefaultName}" har nedladdats med ${backupData.summary.usersCount + backupData.summary.moveOrdersCount + backupData.summary.shippingOrdersCount + backupData.summary.taxiOrdersCount + backupData.summary.moveCleaningOrdersCount + backupData.summary.announcementsCount + backupData.summary.friendRequestsCount} total poster.`);
      } else {
        // For mobile platforms - show data in alert (file system access is complex on mobile)
        showAlert("Backup slutförd", `Backup innehåller:\n• ${backupData.summary.usersCount} användare\n• ${backupData.summary.moveOrdersCount} flyttbeställningar\n• ${backupData.summary.shippingOrdersCount} fraktbeställningar\n• ${backupData.summary.taxiOrdersCount} taxibeställningar\n• ${backupData.summary.moveCleaningOrdersCount} flyttstädningar\n• ${backupData.summary.announcementsCount} annonser\n• ${backupData.summary.friendRequestsCount} vänförfrågningar\n\nAnvänd web-versionen för att ladda ner .zgr-filen direkt.`);
      }
    } catch (error) {
      console.error("Backup error:", error);
      showAlert("Fel", "Kunde inte skapa backup: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while user data is being fetched
  if (!isLoaded || loading) {
    return (
      <SafeAreaView
        className={`flex-1 justify-center items-center ${isDark ? "bg-dark" : "bg-light"}`}
      >
        <ActivityIndicator size="small" color={isDark ? "#fff" : "#000"} />
        <AutoText
          className={`mt-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}
        >
          Laddar profil...
        </AutoText>
      </SafeAreaView>
    );
  }

  // Check if user signed in with Google
  const isGoogleUser = user?.externalAccounts.some(
    (acc) => acc.provider === "google"
  );
  const userAvatar = imageUrl || userProfile?.imageUrl;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <SignedIn>
        {/* Header */}

        {/* Header */}
        <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
          <View className="flex-row items-center justify-center mb-4 relative">
            <TouchableOpacity
              onPress={() => router.back()}
              className="absolute left-0 p-2"
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={isDark ? "#fff" : "#000"}
              />
            </TouchableOpacity>
            <AutoText
              className={`text-2xl font-extrabold text-center ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Profil
            </AutoText>
          </View>
          <AutoText
            className={`text-sm text-center mt-3 mx-5 ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Hantera din profilinformation, uppdatera detaljer och se din
            aktivitet.
          </AutoText>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* User Info Card */}
          <View className="px-6 mt-4">
            <LinearGradient
              colors={getPremiumGradient() as [string, string]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
                elevation: 5,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <View className="items-center mb-4">
                <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-3">
                  {user?.imageUrl ? (
                    <Image
                      source={{ uri: userAvatar }}
                      alt="User Avatar"
                      className={`w-20 h-20 rounded-full border ${
                        isDark ? "border-gray-200" : "border-gray-700"
                      }`}
                    />
                  ) : (
                    <Ionicons name="person" size={32} color="#0ea5e9" />
                  )}
                </View>
                <AutoText
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {!userProfile
                    ? ((user?.firstName + " " + user?.lastName) as string)
                    : userProfile?.firstName && userProfile?.lastName
                      ? `${userProfile.firstName} ${userProfile.lastName}`
                      : (user?.firstName ?? "Användare")}
                </AutoText>
                <AutoText
                  className={`mt-1 ${
                    isDark ? "text-gray-200" : "text-gray-600"
                  }`}
                >
                  {user?.emailAddresses[0]?.emailAddress}
                </AutoText>

                {/* Membership Tier Badge */}
                <View
                  className={`px-3 py-1 rounded-full my-5 ${tierColors.bg}`}
                >
                  <AutoText
                    className={`text-sm font-medium ${tierColors.text}`}
                  >
                    {userProfile?.membershipTier || "Standardmedlem"}
                  </AutoText>
                </View>
              </View>

              <View className="flex-row  my-4 mx-5 items-center justify-between">
                <View className="items-center justify-center ">
                  <AutoText
                    className={`text-lg font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {userProfile?.friendsCount || 0}
                  </AutoText>
                  <AutoText
                    className={isDark ? "text-gray-200" : "text-gray-600"}
                  >
                    Vänner
                  </AutoText>
                </View>
                <View className="items-center ">
                  <AutoText
                    className={`text-lg font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {activeReferrals || 0}
                  </AutoText>
                  <AutoText
                    className={isDark ? "text-gray-200" : "text-gray-600"}
                  >
                    Referrals
                  </AutoText>
                </View>
                <View className="items-center">
                  <AutoText
                    className={`text-lg font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {(user?.unsafeMetadata?.points as number) || 0}
                  </AutoText>
                  <AutoText
                    className={isDark ? "text-gray-200" : "text-gray-600"}
                  >
                    Poäng
                  </AutoText>
                </View>
              </View>

              {/* Google Badge inside user info card */}
              {isGoogleUser && (
                <View className="mt-4 pt-4 border-t border-gray-700">
                  <View className="flex-row items-center justify-center">
                    <View className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="logo-google"
                          size={10}
                          color={isDark ? "#93c5fd" : "#3b82f6"}
                          style={{ marginRight: 4 }}
                        />
                        <AutoText className="text-blue-800 dark:text-blue-200 text-xs font-semibold">
                          Inloggad med Google
                        </AutoText>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Referral Code Section */}
          <View className="px-6 mt-6">
            <AutoText
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Referenskod
            </AutoText>

            <View
              className={`rounded-2xl p-5 shadow-sm ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              <AutoText
                className={`mb-3 text-xs text-center max-w-sm ${
                  isDark ? "text-zinc-400" : "text-zinc-600"
                }`}
              >
                Dela din referenskod med 10 vänner och få 50 poäng när de
                registrerar sig ! , 50 poäng per vän du refererar.
              </AutoText>

              <View
                className={`flex-row items-center justify-between p-4 rounded-2xl ${
                  isDark ? "bg-zinc-700" : "bg-zinc-200"
                }`}
              >
                <AutoText
                  className={`font-semibold text-xs ${
                    isDark ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {userProfile?.referralCode || user?.id}
                </AutoText>
                <View className="flex-row">
                  <TouchableOpacity
                    className="p-2 mr-2"
                    onPress={copyToClipboard}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={20}
                      color={isDark ? "#93c5fd" : "#3b82f6"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Account Settings */}
          <View className="px-6 mt-6">
            <AutoText
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Kontoinställningar
            </AutoText>

            <View
              className={`rounded-2xl shadow-sm overflow-hidden ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              {[
                {
                  icon: icons.person,
                  text: "Personlig information",
                  href: "/profile/personal-information",
                },
                {
                  icon: icons.wallet,
                  text: "Din konto",
                  href: "/profile/wallet",
                },
                {
                  icon: icons.calendar,
                  text: "Dina bokningar",
                  href: "/profile/booking",
                },
                {
                  icon: icons.people,
                  text: " Vänner",
                  href: "/profile/add-friend",
                  badge:
                    pendingFriendRequests > 0
                      ? pendingFriendRequests
                      : undefined,
                },

                {
                  icon: icons.referral,
                  text: "Referera vänner",
                  href: "/profile/referral-users",
                },
                {
                  icon: icons.sheare,
                  text: "Dela appen",
                  href: "/profile/sheare-app",
                },
                ...(userProfile?.isAdmin
                  ? [
                      {
                        icon: icons.bell,
                        text: "Skicka Notifikationer",
                        href: "/profile/admin-notifications",
                      },
                      {
                        icon: icons.backup,
                        text: "Backup Data",
                        onPress: handleBackupData,
                      },
                    ]
                  : []),
              ].map((item, index) => (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: item?.href as any,
                      params: { theme: resolvedTheme },
                    })
                  }
                  key={index}
                  className={`flex-row items-center p-4`}
                >
                  <Image
                    source={item.icon}
                    className="w-5 h-5 mr-3"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                  <AutoText
                    className={`flex-1 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {item.text}
                  </AutoText>
                  <View className="flex-row items-center">
                    {item.badge && (
                      <View className="bg-red-500 rounded-full mr-2 min-w-[20px] min-h-[20px] items-center justify-center">
                        <AutoText className="text-white text-[9px] font-bold">
                          {item.badge}
                        </AutoText>
                      </View>
                    )}
                    <Image
                      source={icons.rightArrow}
                      className="w-4 h-4"
                      style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preferences */}
          <View className="px-6 mt-6">
            <AutoText
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Inställningar
            </AutoText>

            <View
              className={`rounded-2xl shadow-sm overflow-hidden ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              {/* Notification Settings */}
              <NotificationSettings isDark={isDark} />

              {/* Language Selection */}
              <LanguageRow userProfile={userProfile} />

              {/* Theme Toggle */}
              <ThemeToggle />
              {/* Driver Mode Toggle */}
              {userProfile?.isDriver && <DriverToggle isDark={isDark} />}
            </View>
          </View>
          {/* Support */}
          <View className="px-6 mt-6">
            <AutoText
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Support
            </AutoText>

            <View
              className={`rounded-2xl shadow-sm overflow-hidden ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              {[
                {
                  icon: icons.info,
                  text: "Hjälpcenter",
                  onPress: () =>
                    Linking.openURL(
                      `https://wa.me/${process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP}`
                    ), // byt till ditt WhatsApp-nummer
                },
                {
                  icon: icons.shield,
                  text: "Integritetspolicy",
                  href: "/profile/policy",
                },
                {
                  icon: icons.shield,
                  text: "Användarvillkor",
                  href: "/profile/terms",
                },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    if (item.onPress) {
                      item.onPress();
                    } else if (item.href) {
                      router.push(item.href as any);
                    }
                  }}
                  className={`flex-row items-center p-4`}
                >
                  <Image
                    source={item.icon}
                    className="w-5 h-5 mr-3"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                  <AutoText
                    className={`flex-1 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {item.text}
                  </AutoText>
                  <Image
                    source={icons.rightArrow}
                    className="w-4 h-4"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Logout Button */}
          <View className="px-6 mt-6 mb-3">
            <SignOutButton />
          </View>
          <View className=" items-center justify-center mb-20">
            <AutoText
              className={`mb-2 ${isDark ? "text-zinc-700" : "text-gray-300"}`}
            >
              App Version: {Application.nativeApplicationVersion}
            </AutoText>
          </View>
        </ScrollView>
      </SignedIn>
      <RedirectIfSignedOut />
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={isDark ? "light" : "dark"}
      />
    </SafeAreaView>
  );
};

export default Profile;
