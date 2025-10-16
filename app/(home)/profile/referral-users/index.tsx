import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/app/context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { getPremiumGradient } from "@/app/utils/getPremiumGradient";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import Constants from "expo-constants";

interface Referral {
  id: string;
  clerkId: string;
  name: string;
  joinedAt: string;
  status: "pending" | "completed" | "active";
  pointsEarned: number;
}

interface UserMetadata {
  referralCode?: string;
  referralBy?: string;
  referrals?: Referral[];
  points?: number;
}

interface Stats {
  totalPoints: number;
  referralPoints: number;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  activeReferrals: number;
}

export default function ReferralUsers() {
  const { user, isLoaded } = useUser();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"code" | "users" | "add-referral">(
    "code"
  );
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPoints: 0,
    referralPoints: 0,
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    activeReferrals: 0,
  });

  const tabs = [
    { key: "code", label: "Din Kod", icon: "key-outline" },
    {
      key: "users",
      label: `Användare (${stats.totalReferrals})`,
      icon: "people-outline",
    },
    { key: "add-referral", label: "Lägg till kod", icon: "person-add-outline" },
  ];
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [usedReferralCode, setUsedReferralCode] = useState("");
  const [inputReferralCode, setInputReferralCode] = useState("");
  const [isProcessingReferral, setIsProcessingReferral] = useState(false);

  // generate referral code
  const generateReferralCode = (userId: string) => `${userId}`;

  const getOrCreateReferralCode = async (): Promise<string> => {
    if (!user) throw new Error("User not available");
    const metadata = user.unsafeMetadata as UserMetadata;
    if (metadata?.referralCode) return metadata.referralCode;
    const newCode = generateReferralCode(user.id);

    // Update Clerk metadata
    await user.update({
      unsafeMetadata: { ...metadata, referralCode: newCode },
    });

    // Also update Sanity with the referral code
    try {
      const { client } = await import('@/sanityClient');
      const userDoc = await client.fetch(
        `*[_type == "users" && clerkId == $clerkId][0]`,
        { clerkId: user.id }
      );

      if (userDoc) {
        await client.patch(userDoc._id).set({ referralCode: newCode }).commit();
      } else {
        // Create user document if it doesn't exist
        await client.create({
          _type: 'users',
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          referralCode: newCode,
          points: 0,
        });
      }
    } catch (error) {
      console.error('Error updating referral code in Sanity:', error);
    }

    return newCode;
  };

  const loadReferralData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const code = await getOrCreateReferralCode();
      setReferralCode(code);
      const metadata = user.unsafeMetadata as UserMetadata;
      setUsedReferralCode(metadata?.referralBy || "");

      // Get points and referrals from Sanity as source of truth
      let totalPoints = metadata?.points ?? 0;
      let currentReferrals = Array.isArray(metadata?.referrals)
        ? metadata.referrals
        : [];
      try {
        const { client } = await import('@/sanityClient');
        const userDoc = await client.fetch(
          `*[_type == "users" && clerkId == $clerkId][0]`,
          { clerkId: user.id }
        );
        if (userDoc?.points !== undefined) {
          totalPoints = userDoc.points;
          // Sync Clerk metadata with Sanity
          if (metadata?.points !== totalPoints) {
            await user.update({
              unsafeMetadata: {
                ...metadata,
                points: totalPoints,
              }
            });
          }
        }
        if (userDoc?.referrals && Array.isArray(userDoc.referrals)) {
          // Sync referrals with Sanity
          const sanityReferrals = userDoc.referrals;
          if (JSON.stringify(currentReferrals) !== JSON.stringify(sanityReferrals)) {
            await user.update({
              unsafeMetadata: {
                ...metadata,
                referrals: sanityReferrals,
              }
            });
            currentReferrals = sanityReferrals;
          }
        }
      } catch (error) {
        console.error('Error loading data from Sanity:', error);
      }
      setReferrals(currentReferrals);
      setStats({
        totalPoints: totalPoints,
        referralPoints: currentReferrals.reduce(
          (sum, r) => sum + (r.pointsEarned || 0),
          0
        ),
        totalReferrals: currentReferrals.length,
        completedReferrals: currentReferrals.filter(
          (r) => r.status === "completed"
        ).length,
        pendingReferrals: currentReferrals.filter((r) => r.status === "pending")
          .length,
        activeReferrals: currentReferrals.filter((r) => r.status === "active")
          .length,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded && user) loadReferralData();
  }, [isLoaded, user, loadReferralData]);

  const handleShare = async () => {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'c7b65ce0-2aa6-4b42-b6d7-4f04277bc839';
      const runtimeVersion = Constants.expoConfig?.version || '1.0.0';
      const message = `Hej! Använd min referral-kod ${referralCode} och få bonuspoäng 🎁\n\nLadda ner appen här: https://expo.dev/preview/update?message=referral+bonus&updateRuntimeVersion=${runtimeVersion}&createdAt=${encodeURIComponent(new Date().toISOString())}&slug=exp&projectId=${projectId}&group=latest`;
      await Share.share({
        message,
      });
    } catch (error) {
      showAlert("Fel", "Kunde inte dela koden.");
    }
  };

  const handleAddReferralCode = async () => {
    const code = inputReferralCode.trim();

    if (!code) {
      showAlert("Fel", "Vänligen ange en referral-kod");
      return;
    }

    if (code === referralCode) {
      showAlert("Fel", "Du kan inte använda din egen referral-kod");
      return;
    }

    if (usedReferralCode) {
      showAlert("Info", "Du har redan använt en referral-kod");
      return;
    }

    setIsProcessingReferral(true);

    try {
      // Check if the referral code exists and belongs to another user
      const { client } = await import('@/sanityClient');

      // Find the user with this referral code (check both referralCode and clerkId as fallback)
      let referrerUser = await client.fetch(
        `*[_type == "users" && referralCode == $code][0]`,
        { code }
      );

      // If not found by referralCode, try searching by clerkId
      if (!referrerUser) {
        referrerUser = await client.fetch(
          `*[_type == "users" && clerkId == $code][0]`,
          { code }
        );
      }

      if (!referrerUser) {
        showAlert("Fel", "Ogiltig referral-kod - kunde inte hitta användaren");
        return;
      }

      if (referrerUser.clerkId === user?.id) {
        showAlert("Fel", "Du kan inte använda din egen referral-kod");
        return;
      }

      // Check if user already has referrals from this referrer
      const existingReferral = referrals.find(r => r.clerkId === referrerUser.clerkId);
      if (existingReferral) {
        showAlert("Info", "Du har redan använt denna referral-kod");
        return;
      }

      // Check if referrer has reached their maximum referral limit (10)
      const referrerReferrals = referrerUser.referrals || [];
      if (referrerReferrals.length >= 10) {
        showAlert("Info", "Denna användare har redan nått maxgränsen för referrals (10 användare)");
        return;
      }

      // Check if current user has reached their maximum referral limit (10)
      if (referrals.length >= 10) {
        showAlert("Info", "Du kan endast använda upp till 10 referral-koder");
        return;
      }

      // Award points to both users
      const referralBonus = 50; // 50 points bonus

      // Update current user's points
      const currentUserPoints = stats.totalPoints;
      const newUserPoints = currentUserPoints + referralBonus;

      // Update referrer's points
      const referrerPoints = referrerUser.points || 0;
      const newReferrerPoints = referrerPoints + referralBonus;

      // Update current user in Sanity
      const currentUserDoc = await client.fetch(
        `*[_type == "users" && clerkId == $clerkId][0]`,
        { clerkId: user?.id }
      );

      if (currentUserDoc) {
        await client.patch(currentUserDoc._id).set({ points: newUserPoints }).commit();
      }

      // Update referrer in Sanity
      await client.patch(referrerUser._id).set({ points: newReferrerPoints }).commit();

      // Update current user's metadata
      const newReferral = {
        id: `referral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clerkId: referrerUser.clerkId,
        name: referrerUser.name || referrerUser.firstName || `User ${referrerUser.clerkId.slice(-8)}`,
        joinedAt: new Date().toISOString(),
        status: "active" as const,
        pointsEarned: referralBonus,
      };

      const updatedReferrals = [...referrals, newReferral];
      const updatedStats = {
        ...stats,
        totalPoints: newUserPoints,
        referralPoints: stats.referralPoints + referralBonus,
        totalReferrals: updatedReferrals.length,
        completedReferrals: stats.completedReferrals + 1,
      };

      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          points: newUserPoints,
          referrals: updatedReferrals,
          referralBy: code,
        }
      });

      // Update referrer's metadata (add referral record)
      // Note: This would require server-side implementation for other users
      // For now, we'll just update their points in Sanity

      // Add referral record to referrer's metadata (if we can access it)
      // This is a simplified version - in production you'd want server-side logic
      const referrerReferralRecord = {
        id: `referral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clerkId: user?.id || '',
        name: user?.fullName || user?.firstName || `User ${user?.id?.slice(-8)}`,
        joinedAt: new Date().toISOString(),
        status: "completed" as const,
        pointsEarned: referralBonus,
      };

      // Update referrer's referrals in Sanity
      const referrerCurrentReferrals = referrerUser.referrals || [];
      const updatedReferrerReferrals = [...referrerCurrentReferrals, referrerReferralRecord];

      await client.patch(referrerUser._id).set({
        referrals: updatedReferrerReferrals.slice(0, 100), // Limit to 100
        points: newReferrerPoints
      }).commit();

      // Add transaction record for current user
      const transactions = (user?.unsafeMetadata as any)?.transactions || [];
      transactions.unshift({
        id: `referral_bonus_${Date.now()}`,
        type: "earned",
        points: referralBonus,
        description: `Referral bonus från ${newReferral.name}`,
        date: new Date().toISOString(),
      });

      // Keep only the last 50 transactions
      const limitedTransactions = transactions.slice(0, 50);

      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          transactions: limitedTransactions,
        }
      });

      // Update local state
      setReferrals(updatedReferrals);
      setStats(updatedStats);
      setUsedReferralCode(code);
      setInputReferralCode("");

      showAlert(
        "Referral lyckades! 🎉",
        `Du har fått ${referralBonus} bonuspoäng! ${newReferral.name} har också fått ${referralBonus} poäng.`
      );

      // Send notification to referrer
      const notificationPayload = {
        title: "Referral bonus! 🎉",
        message: `${user?.fullName || user?.firstName || 'En användare'} använde din referral-kod och du fick ${referralBonus} bonuspoäng!`,
        subID: referrerUser.clerkId,
        pushData: {
          type: "referral_bonus",
          amount: referralBonus,
          fromUser: user?.fullName || user?.firstName || 'En användare',
        },
      };

      await nativeNotifyAPI.sendNotification(notificationPayload);

    } catch (error: any) {
      console.error("Referral error:", error);
      showAlert("Fel", error.message || "Kunde inte använda referral-koden");
    } finally {
      setIsProcessingReferral(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        className={`flex-1 justify-center items-center ${
          isDark ? "bg-dark" : "bg-light"
        }`}
      >
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
        <AutoText className={`mt-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Laddar referral-data...
        </AutoText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.delay(100).springify()}
        className="pb-4 px-6"
      >
        <View className="flex-row items-center justify-center mb-4 mt-5 relative">
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
            className={`text-xl font-extrabold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Referral
          </AutoText>
          <TouchableOpacity
            onPress={loadReferralData}
            className="absolute right-0 p-2"
            disabled={refreshing}
          >
            <Ionicons
              name="refresh"
              size={24}
              color={isDark ? "#fff" : "#000"}
            />
          </TouchableOpacity>
        </View>
        <AutoText
          className={`text-sm text-center my-2 ${
            isDark ? "text-gray-300" : "text-gray-600"
          }`}
        >
          Få bonuspoäng genom att bjuda in dina vänner 
        </AutoText>
        <AutoText
          className={`text-xs text-center mb-4 mt-1 ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          ⚠️ Varje användare kan endast referera upp till 10 andra användare (max 10 användare).
        </AutoText>
      </Animated.View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-6 mt-6"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Points Summary with gradient */}
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
          className="mb-6 gap-2"
        >
          <LinearGradient
            colors={getPremiumGradient() as [string, string]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            className="p-5 rounded-2xl shadow-lg items-center"
            style={{
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              borderRadius: 20,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <AutoText
              className={`text-sm mb-1 ${
                isDark ? "text-white " : "text-black"
              }`}
            >
              Totala poäng
            </AutoText>
            <AutoText
              className={`text-3xl font-extrabold e ${
                isDark ? "text-white " : "text-black"
              }`}
            >
              {stats.totalPoints}
            </AutoText>
            <AutoText
              className={`text-xs mt-1 ${isDark ? "text-white" : "text-black"}`}
            >
              {stats.referralPoints > 0
                ? `+${stats.referralPoints} poäng från referrals`
                : "Inga referralpoäng ännu"}
            </AutoText>
          </LinearGradient>
        </Animated.View>
        {/* Referral Stats Cards */}
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          className="my-2 flex-row flex-wrap justify-between"
        >
          {/* Total Referrals */}
          <View
            className={`w-[48%] p-4 mb-4 rounded-2xl shadow-lg text-center items-center border  ${
              isDark
                ? "bg-dark-card border-gray-700"
                : "bg-light-card border-gray-100"
            }`}
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <AutoText className="text-sm text-gray-400 mb-2">Totalt</AutoText>
            <AutoText
              className={`text-2xl font-bold ${
                isDark ? "text-white" : "text-black"
              }`}
            >
              {stats.totalReferrals}
            </AutoText>
          </View>

          {/* Active Referrals */}
          <View
            className={`w-[48%] p-4 mb-4 rounded-2xl shadow-lg text-center items-center border ${
              isDark
                ? "bg-dark-card border-gray-700"
                : "bg-light-card border-gray-100"
            }`}
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <AutoText className="text-sm text-gray-400 mb-2">Aktiva</AutoText>
            <AutoText className={`text-2xl font-bold text-green-500`}>
              {stats.activeReferrals || stats.completedReferrals}
            </AutoText>
          </View>

          {/* Pending Referrals */}
          <View
            className={`w-[48%] p-4 mb-4 rounded-2xl shadow-lg text-center items-center border ${
              isDark
                ? "bg-dark-card border-gray-700"
                : "bg-light-card border-gray-100"
            }`}
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <AutoText className="text-sm text-gray-400 mb-2">Väntar</AutoText>
            <AutoText className={`text-2xl font-bold text-yellow-500`}>
              {stats.pendingReferrals}
            </AutoText>
          </View>

          {/* Completed Referrals */}
          <View
            className={`w-[48%] p-4 mb-4 rounded-2xl shadow-lg text-center items-center border ${
              isDark
                ? "bg-dark-card border-gray-700"
                : "bg-light-card border-gray-100"
            }`}
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <AutoText className="text-sm text-gray-400 mb-2">Genomförda</AutoText>
            <AutoText className={`text-2xl font-bold text-blue-500`}>
              {stats.completedReferrals}
            </AutoText>
          </View>
        </Animated.View>
        {/* Tabs */}

        <View className="flex-row justify-center my-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                onPressIn={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-t-lg border-b-2 mx-2 ${
                  isActive ? "border-blue-500" : "border-transparent"
                }`}
              >
                <View className="flex-row items-center gap-1">
                  <Ionicons
                    name={tab.icon as any}
                    size={12}
                    color={
                      isActive ? "#3b82f6" : isDark ? "#9ca3af" : "#6b7280"
                    }
                  />
                  <AutoText
                    className={`text-base font-medium ${
                      isActive
                        ? "text-blue-500"
                        : isDark
                        ? "text-gray-400/50"
                        : "text-gray-500/50"
                    }`}
                  >
                    {tab.label}
                  </AutoText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Code Tab */}
        {activeTab === "code" && (
          <Animated.View
            entering={FadeInUp.delay(100).springify()}
            className="mt-2"
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <View
              className={`p-5 rounded-2xl shadow-md mb-6 border ${
                isDark
                  ? "bg-dark-card border-gray-700"
                  : "bg-light-card border-gray-100"
              }`}
            >
              <View className="flex flex-row gap-3 items-center my-3  ">
                <AutoText
                  className={`text-base font-bold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Din kod :
                </AutoText>
                <AutoText
                  className={`text-sm font-medium mb-4 ${
                    isDark ? "text-white" : "text-black"
                  }`}
                >
                  {referralCode}
                </AutoText>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    Share.share({ message: referralCode });
                    showAlert("Kopierad", "Koden kopierad!");
                  }}
                  className="flex-1 bg-blue-500 p-3 rounded-xl items-center"
                >
                  <AutoText className="text-white font-semibold text-base">
                    Kopiera kod
                  </AutoText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShare}
                  className="flex-1 bg-green-500 p-3 rounded-xl items-center"
                >
                  <AutoText className="text-white font-semibold text-base">
                    Dela
                  </AutoText>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
        {activeTab === "users" && (
          <Animated.View
            entering={FadeInUp.delay(150).springify()}
            className="mt-2"
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            {referrals.length === 0 ? (
              <View
                className={`p-5 rounded-2xl shadow-md mb-6 border items-center justify-center  ${
                  isDark
                    ? "bg-dark-card border-gray-700"
                    : "bg-light-card border-gray-100"
                }`}
              >
                <Ionicons
                  name="people-outline"
                  size={40}
                  color={isDark ? "#9ca3af" : "#6b7280"}
                />
                <AutoText
                  className={`mt-2 ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Inga referral-användare ännu.
                </AutoText>
              </View>
            ) : (
              referrals.map((ref, index) => (
                <Animated.View
                  key={ref.id}
                  entering={FadeInUp.delay(200 + index * 100).springify()}
                  className="mb-4"
                >
                  <View
                    className={`p-4 rounded-xl mb-3 ${
                      isDark ? "bg-dark-card" : "bg-light-card"
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className="w-12 h-12 rounded-full bg-gray-300 mr-3 overflow-hidden">
                          <View className="w-full h-full bg-gray-400 items-center justify-center">
                            <AutoText className="text-white font-bold text-lg">
                              {ref.name.charAt(0).toUpperCase()}
                            </AutoText>
                          </View>
                        </View>
                        <View className="flex-1">
                          <View className="flex flex-row justify-between items-center my-1">
                            <AutoText
                              className={`font-semibold ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {ref.name}
                            </AutoText>
                            <View className="flex-row items-center gap-2">
                              <View
                                className={`px-2 py-1 rounded-full ${
                                  ref.status === "active" || ref.status === "completed"
                                    ? "bg-green-100"
                                    : ref.status === "pending"
                                    ? "bg-yellow-100"
                                    : "bg-blue-100"
                                }`}
                              >
                                <AutoText
                                  className={`text-xs font-medium ${
                                    ref.status === "active" || ref.status === "completed"
                                      ? "text-green-700"
                                      : ref.status === "pending"
                                      ? "text-yellow-700"
                                      : "text-blue-700"
                                  }`}
                                >
                                  {ref.status === "active"
                                    ? "Genomförd & Aktiv"
                                    : ref.status === "pending"
                                    ? "Väntar"
                                    : "Genomförd & Aktiv"}
                                </AutoText>
                              </View>
                              {ref.status === "active" && (
                                <View className="flex-row items-center gap-1">
                                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                                  <AutoText className="text-xs text-green-600 font-medium">
                                    Bonus mottagen
                                  </AutoText>
                                </View>
                              )}
                            </View>
                          </View>

                          <AutoText
                            className={`text-sm mt-2 ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            {ref.clerkId}
                          </AutoText>

                          <View className="flex-row items-center justify-between mt-2">
                            <AutoText
                              className={`text-xs ${
                                isDark ? "text-gray-500" : "text-gray-500"
                              }`}
                            >
                              Anslöt: {new Date(ref.joinedAt).toLocaleDateString("sv-SE")}
                            </AutoText>

                            <View className="flex-row items-center gap-1 mt-2">
                              <Ionicons
                                name="trophy-outline"
                                size={12}
                                color={ref.pointsEarned > 0 ? "#22c55e" : "#9ca3af"}
                              />
                              <AutoText
                                className={`text-xs font-semibold ${
                                  ref.pointsEarned > 0
                                    ? "text-green-500"
                                    : "text-gray-400"
                                }`}
                              >
                                +{ref.pointsEarned} poäng
                              </AutoText>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              ))
            )}
          </Animated.View>
        )}

        {activeTab === "add-referral" && (
          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            className="mt-2"
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <View
              className={`p-5 rounded-2xl shadow-md mb-6 border  ${
                isDark
                  ? "bg-dark-card border-gray-700"
                  : "bg-light-card border-gray-100"
              }`}
            >
              <Input
                placeholder="Ange referral-koden"
                value={inputReferralCode}
                onChangeText={setInputReferralCode}
                placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
                className={`p-4 rounded-xl mb-5 border ${
                  isDark
                    ? "bg-dark/50 text-white border-gray-700"
                    : "bg-light/50 text-black border-gray-100"
                }`}
              />
              <TouchableOpacity
                onPress={handleAddReferralCode}
                disabled={isProcessingReferral || !inputReferralCode.trim()}
                className={`p-3 rounded-xl items-center ${
                  isProcessingReferral || !inputReferralCode.trim()
                    ? "bg-gray-500"
                    : "bg-blue-500"
                }`}
              >
                <AutoText className="text-white font-bold">
                  {isProcessingReferral ? "Bearbetar..." : "Använd referral-kod"}
                </AutoText>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
