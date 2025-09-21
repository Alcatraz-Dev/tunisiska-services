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

  // generate referral code
  const generateReferralCode = (userId: string) => `${userId}`;

  const getOrCreateReferralCode = async (): Promise<string> => {
    if (!user) throw new Error("User not available");
    const metadata = user.unsafeMetadata as UserMetadata;
    if (metadata?.referralCode) return metadata.referralCode;
    const newCode = generateReferralCode(user.id);
    await user.update({
      unsafeMetadata: { ...metadata, referralCode: newCode },
    });
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
      const currentReferrals = Array.isArray(metadata?.referrals)
        ? metadata.referrals
        : [];
      setReferrals(currentReferrals);
      setStats({
        totalPoints: metadata?.points ?? 0,
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
      const message = `Hej! Använd min referral-kod ${referralCode} och få bonuspoäng 🎁\n\nLadda ner appen här: https://expo.dev/@your-app-link`;
      await Share.share({
        message,
      });
    } catch (error) {
      showAlert("Fel", "Kunde inte dela koden.");
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
              {stats.activeReferrals}
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
                    className={`p-5 rounded-2xl shadow-md mb-6 ${
                      isDark ? "bg-dark-card" : "bg-light-card"
                    }`}
                  >
                    {/* Name + Status Badge */}
                    <View className="flex-row items-center justify-between mb-2">
                      <AutoText
                        className={`font-semibold text-lg ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {ref.name}
                      </AutoText>
                      <View
                        className={`px-3 py-1 rounded-full ${
                          ref.status === "active"
                            ? "bg-green-100"
                            : ref.status === "pending"
                            ? "bg-yellow-100"
                            : "bg-blue-100"
                        }`}
                      >
                        <AutoText
                          className={`text-xs font-medium ${
                            ref.status === "active"
                              ? "text-green-700"
                              : ref.status === "pending"
                              ? "text-yellow-700"
                              : "text-blue-700"
                          }`}
                        >
                          {ref.status === "active"
                            ? "Aktiv"
                            : ref.status === "pending"
                            ? "Väntar"
                            : "Genomförd"}
                        </AutoText>
                      </View>
                    </View>

                    {/* ID */}
                    <AutoText
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {ref.id}
                    </AutoText>

                    {/* Joined date */}
                    <AutoText
                      className={`text-xs mt-2 ${
                        isDark ? "text-gray-500" : "text-gray-500"
                      }`}
                    >
                      Anslöt:{" "}
                      {new Date(ref.joinedAt).toLocaleDateString("sv-SE")}
                    </AutoText>

                    {/* Points earned */}
                    <View className="flex-row items-center gap-2 mt-3">
                      <Ionicons
                        name={
                          ref.pointsEarned > 0
                            ? "trophy-outline"
                            : "time-outline"
                        }
                        size={12}
                        color={ref.pointsEarned > 0 ? "#22c55e" : "#9ca3af"}
                      />
                      <AutoText
                        className={`text-sm font-semibold ${
                          ref.pointsEarned > 0
                            ? "text-green-500"
                            : "text-gray-400"
                        }`}
                      >
                        {ref.pointsEarned > 0
                          ? `+${ref.pointsEarned} poäng tjänade`
                          : "Inga poäng ännu"}
                      </AutoText>
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
                placeholder=" referral-koden"
                value={inputReferralCode}
                onChangeText={setInputReferralCode}
                placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
                className={`p-4 rounded-xl mb-5 border ${
                  isDark
                    ? "bg-dark/50 text-white border-gray-700"
                    : "bg-light/50 text-black border-gray-100"
                }`}
              />
              <TouchableOpacity className="bg-blue-500 p-3 rounded-xl items-center">
                <AutoText className="text-white font-bold">
                  Lägg till vän
                </AutoText>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
