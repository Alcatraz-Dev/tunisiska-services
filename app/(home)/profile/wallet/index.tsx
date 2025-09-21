import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/app/context/ThemeContext";
import { useRouter } from "expo-router";
import Animated, {
  FadeInUp,
  FadeInDown,
  ZoomIn,
  withRepeat,
  withSequence,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { getPremiumGradient } from "@/app/utils/getPremiumGradient";
import icons from "@/app/constants/icons";
import { SwishPay } from "@/app/components/SwishPay";
import { AutoText } from "@/app/components/ui/AutoText";
import { showAlert } from "@/app/utils/showAlert";
import { SafeAreaView } from "react-native-safe-area-context";

interface Referral {
  id: string;
  clerkId: string;
  name: string;
  joinedAt: string;
  status: "pending" | "completed" | "active";
  pointsEarned: number;
}

interface Transaction {
  id: string;
  type: "earned" | "spent" | "withdrawn";
  points: number;
  description: string;
  date: string;
}

interface UserMetadata {
  points?: number;
  referrals?: Referral[];
  transactions?: Transaction[];
  lastRewardDate?: string;
  streak?: number;
}

export default function Wallet() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastRewardDate, setLastRewardDate] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const pulse = useSharedValue(1);

  const loadWalletData = useCallback(() => {
    if (!user) return;
    const metadata = user.unsafeMetadata as UserMetadata;

    // If metadata.points already contains referral points:
    const totalPoints = metadata.points ?? 0;

    setPoints(totalPoints);
    setTransactions(metadata.transactions ?? []);
    setLastRewardDate(metadata.lastRewardDate ?? null);
    setStreak(metadata.streak ?? 0);
  }, [user]);

  useEffect(() => {
    if (isLoaded && user) loadWalletData();
  }, [isLoaded, user, loadWalletData]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withSpring(1.1), withSpring(0.9)),
      -1,
      true
    );
  }, []);

  const walletValue = (points / 100) * 10;

  const updateUserData = (
    newPoints: number,
    newTransactions: Transaction[],
    newLastRewardDate?: string,
    newStreak?: number
  ) => {
    setPoints(newPoints);
    setTransactions(newTransactions);
    if (newLastRewardDate) setLastRewardDate(newLastRewardDate);
    if (newStreak !== undefined) setStreak(newStreak);

    user?.update({
      unsafeMetadata: {
        ...(user?.unsafeMetadata as UserMetadata),
        points: newPoints,
        transactions: newTransactions,
        lastRewardDate: newLastRewardDate ?? lastRewardDate,
        streak: newStreak ?? streak,
      },
    });
  };

  const handleDailyReward = () => {
    const today = new Date().toISOString().split("T")[0];
    if (lastRewardDate === today) {
      return showAlert("Redan hämtad", "Du har redan hämtat dagens belöning!");
    }

    const newStreak = streak >= 7 ? 1 : streak + 1;

    const rewardPoints = 10 * newStreak;
    const newPoints = points + rewardPoints;
    const newTx: Transaction = {
      id: Date.now().toString(),
      type: "earned",
      points: rewardPoints,
      description: `Dag ${newStreak} belöning 🎁`,
      date: new Date().toISOString(),
    };
    updateUserData(newPoints, [newTx, ...transactions], today, newStreak);
    showAlert("🎉 Belöning hämtad!", `Du fick ${rewardPoints} poäng`);
  };
  const topUps = [
    { amount: 49, points: 500 },
    { amount: 99, points: 1100 },
    { amount: 149, points: 1700 },
    { amount: 199, points: 2300 },
    { amount: 249, points: 2900 },
    { amount: 299, points: 3500 },
    { amount: 399, points: 4800 },
    { amount: 499, points: 6000 },
  ];
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const swish_number = process.env.EXPO_PUBLIC_SWISH_NUMBER!;
  if (!isLoaded || !user) {
    return (
      <SafeAreaView
        className={`flex-1 ${
          isDark ? "bg-dark" : "bg-light"
        } justify-center items-center`}
      >
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
        <AutoText className={`mt-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Laddar wallet...
        </AutoText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
        <View className="flex-row items-center justify-center relative mb-4">
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
            Din Wallet
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center mt-3 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Se din senaste aktivitet och transaktioner
        </AutoText>
      </View>

      <ScrollView
        className=" mt-4 px-6 "
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Modern Wallet Card */}
        <Animated.View entering={FadeInUp.duration(600)}>
          <LinearGradient
            colors={getPremiumGradient() as [string, string]}
            className="p-6 rounded-3xl shadow-lg"
            style={{
              borderRadius: 20,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 5,
            }}
          >
            <View className="flex-row justify-between items-center rounded-3xl p-5">
              <View>
                <AutoText
                  className={` text-sm mb-2 ${
                    isDark ? "text-white" : "text-dark"
                  }`}
                >
                  Totala poäng
                </AutoText>
                <AutoText
                  className={`text-4xl font-extrabold mb-2 ${
                    isDark ? "text-white" : "text-dark"
                  }`}
                >
                  {points} poäng
                </AutoText>
                <AutoText
                  className={` mt-1 ${isDark ? "text-white" : "text-dark"}`}
                >
                  {walletValue > 0
                    ? `≈ ${walletValue.toFixed(2)} kr`
                    : "Inget värde ännu"}
                </AutoText>
              </View>
              <Image
                source={icons.wallet}
                className={` w-14 h-14 ${isDark ? "text-white" : "text-dark"}`}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Daily Reward Week Map */}
        <Animated.View entering={FadeInDown.delay(300)} className="mt-6">
          <AutoText
            className={`text-lg font-bold mb-5 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Dagliga Belöningar
          </AutoText>
          <View className="flex-row justify-between">
            {Array.from({ length: 7 }).map((_, i) => {
              const day = i + 1;
              const isClaimed = day <= streak;
              const isToday = day === streak + 1;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={isToday ? handleDailyReward : undefined}
                  disabled={!isToday}
                  className={`flex-1 mx-1 p-1.5 rounded-xl items-center shadow-md ${
                    isDark ? "bg-dark-card" : "bg-light-card"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 5,
                  }}
                >
                  {isClaimed ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#22c55e"
                    />
                  ) : isToday ? (
                    <Animated.View style={animatedStyle}>
                      <Ionicons name="gift" size={20} color="#facc15" />
                    </Animated.View>
                  ) : (
                    <Ionicons
                      name="lock-closed"
                      size={20}
                      color={isDark ? "#6b7280" : "#9ca3af"}
                    />
                  )}
                  <AutoText
                    className={`mt-2 text-xs  flex-1 flex-row ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Dag {day}
                  </AutoText>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <View className="flex-row mt-6  gap-4 items-center justify-center">
          <TouchableOpacity
            onPress={() => router.push("/profile/referral-users")}
            className={`flex-1  py-4 px-3 rounded-xl items-center justify-center ${
              isDark ? " bg-blue-400" : "bg-blue-500"
            }`}
          >
            <AutoText className="text-black font-bold">Tjäna poäng</AutoText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            className={`flex-1 bg-green-500 py-4 px-3 rounded-xl items-center justify-center ${
              isDark ? " bg-yellow-400" : "bg-yellow-500"
            }`}
          >
            <AutoText
              className={`font-bold ${isDark ? "text-dark" : " text-dark"}`}
            >
              Använd poäng
            </AutoText>
          </TouchableOpacity>
        </View>
        {/* Row 2: Buy with money */}
        <AutoText
          className={`text-lg font-bold mt-4 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Köpa med pengar
        </AutoText>
        <View className="mt-6 flex-row flex-wrap justify-between gap-2">
          {topUps.map((topUp, index) => {
            const isLastTwo = index >= topUps.length - 2; // last two items
            return (
              <Animated.View
                key={topUp.amount}
                entering={FadeIn.duration(500)}
                exiting={FadeOut.duration(500)}
                className={`rounded-xl shadow-md overflow-hidden ${
                  isLastTwo ? "w-[48%]" : "w-[30%]"
                }`}
              >
                <SwishPay
                  orderId={Date.now().toString()}
                  amount={topUp.amount}
                  number={swish_number}
                  lineItems={[
                    {
                      name: `${topUp.points} Poäng`,
                      quantity: 1,
                      price: topUp.amount,
                    },
                  ]}
                  className="flex-1 items-center justify-center py-2 px-1 gap-2"
                  textClassName={`font-bold text-xs text-center ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                />
              </Animated.View>
            );
          })}
        </View>

        {/* Transaction History */}
        <AutoText
          className={`text-lg font-semibold mt-8 mb-3 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Senaste aktivitet
        </AutoText>
        {transactions.length === 0 ? (
          <AutoText className={`${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Inga transaktioner ännu
          </AutoText>
        ) : (
          transactions.map((tx) => (
            <Animated.View
              key={tx.id}
              entering={ZoomIn.duration(300)} 
              className="flex-row justify-between items-center mb-2 "
            >
              <View
                className={`flex-1 flex-row items-center p-4 rounded-xl  ${
                  isDark ? "bg-dark-card" : "bg-light-card"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 5, // only works on Android
                }}
              >
                <Ionicons
                  name={
                    tx.type === "earned"
                      ? "arrow-up-circle"
                      : tx.type === "spent"
                      ? "cart"
                      : "cash"
                  }
                  size={24}
                  color={
                    tx.type === "earned"
                      ? "#22c55e"
                      : tx.type === "spent"
                      ? "#ef4444"
                      : "#f59e0b"
                  }
                  style={{ marginRight: 8 }}
                />
                <View className="flex-1  justify-between gap-1.5">
                  <AutoText
                    className={`font-semibold mb-1 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {tx.description}
                  </AutoText>
                  <AutoText
                    className={`${
                      isDark ? "text-gray-400" : "text-gray-500"
                    } text-xs`}
                  >
                    {new Date(tx.date).toLocaleDateString("sv-SE")}
                  </AutoText>
                </View>
                <AutoText
                className={`ml-2 font-bold ${
                  tx.type === "earned"
                    ? "text-green-500"
                    : tx.type === "spent"
                    ? "text-red-500"
                    : "text-yellow-400"
                }`}
              >
                {tx.type === "earned"
                  ? `+${tx.points} poäng`
                  : `-${tx.points} poäng`}
              </AutoText>
              </View>

              
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
