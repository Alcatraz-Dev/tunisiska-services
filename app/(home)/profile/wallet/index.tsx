import { Platform } from 'react-native';
import { AutoText } from "@/app/components/ui/AutoText";
import icons from "@/app/constants/icons";
import { useTheme } from "@/app/context/ThemeContext";
import { getPremiumGradient } from "@/app/utils/getPremiumGradient";
import { showAlert } from "@/app/utils/showAlert";

// No Stripe imports needed - using universal implementation

import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Payment from "@/app/components/Payment";

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

  // Stripe is available on both web and native platforms
  const stripeAvailable = true;

  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastRewardDate, setLastRewardDate] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [globalDisable, setGlobalDisable] = useState(false);
  const pulse = useSharedValue(1);

  const loadWalletData = useCallback(async () => {
    if (!user) return;
    const metadata = user.unsafeMetadata as UserMetadata;

    // Get points from Clerk metadata (this is the single source of truth)
    const totalPoints = metadata.points ?? 0;

    setPoints(totalPoints);
    setTransactions(metadata.transactions ?? []);
    setLastRewardDate(metadata.lastRewardDate ?? null);
    setStreak(metadata.streak ?? 0);

    // Also sync with Sanity if needed (for consistency)
    try {
      const { client } = await import('@/sanityClient');
      const sanityUser = await client.fetch(
        `*[_type == "users" && clerkId == $clerkId][0]`,
        { clerkId: user.id }
      );

      if (sanityUser && sanityUser.points !== totalPoints) {
        console.log(`🔄 Syncing points: Clerk=${totalPoints}, Sanity=${sanityUser.points}`);
        // Update Clerk to match Sanity if they differ
        await user.update({
          unsafeMetadata: {
            ...metadata,
            points: sanityUser.points,
          }
        });
        setPoints(sanityUser.points);
      }
    } catch (error) {
      console.error('Error syncing with Sanity:', error);
      // Continue with Clerk data if Sanity sync fails
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded && user) {
      loadWalletData();
    }
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

  const handleDailyReward = async () => {
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

    // Also update points in Sanity database
    try {
      const { client } = await import('@/sanityClient');
      const userDoc = await client.fetch(
        `*[_type == "users" && clerkId == $clerkId][0]`,
        { clerkId: user?.id }
      );

      if (userDoc) {
        await client
          .patch(userDoc._id)
          .set({ points: newPoints })
          .commit();
      } else {
        await client.create({
          _type: 'users',
          clerkId: user?.id,
          email: user?.primaryEmailAddress?.emailAddress || '',
          points: newPoints,
        });
      }

      console.log(`✅ Updated Sanity points after daily reward: ${newPoints}`);
    } catch (error) {
      console.error('❌ Error updating Sanity points after daily reward:', error);
    }

    // showAlert("🎉 Belöning hämtad!", `Du fick ${rewardPoints} poäng`);
  };
  
  const handlePaymentSuccess = (purchasedPoints: number, amountPaid: number) => {
    console.log("💎 [PAYMENT SUCCESS] Adding", purchasedPoints, "points to user");
    
    const newPoints = points + purchasedPoints;
    const newTx: Transaction = {
      id: Date.now().toString(),
      type: "earned",
      points: purchasedPoints,
      description: `Köp av ${purchasedPoints} poäng för ${amountPaid} SEK 💳`,
      date: new Date().toISOString(),
    };
    
    // Update user data with new points and transaction
    updateUserData(newPoints, [newTx, ...transactions]);
    
    console.log("✅ [PAYMENT SUCCESS] User now has", newPoints, "total points");
    
    // Show success celebration
    setTimeout(() => {
      showAlert(
        "🎉 Poäng tillagda!",
        `Grattis! Du har nu ${newPoints} poäng i din wallet.\n\nDin senaste transaktion:\n+${purchasedPoints} poäng för ${amountPaid} SEK`
      );
    }, 500); // Small delay to let the payment success alert show first
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

  // Payment processing is now handled by Stripe
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
  // No Stripe URL callback handling needed for universal implementation

  // No deep link handling needed for universal Stripe implementation

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
                    className={`mt-2 text-[9px]  flex-1 flex-row ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Dag{day}
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
            onPress={() => router.push("/(home)/profile/transfer-points")}
            className={`flex-1 bg-green-500 py-4 px-3 rounded-xl items-center justify-center ${
              isDark ? " bg-yellow-400" : "bg-yellow-500"
            }`}
          >
            <AutoText
              className={`font-bold ${isDark ? "text-dark" : " text-dark"}`}
            >
              Överför poäng
            </AutoText>
          </TouchableOpacity>
        </View>
        {/* Premium Payment Cards - Smaller Enhanced Design */}
        <View className="flex-row items-center justify-between mb-2 mt-2">
          <AutoText
            className={`text-lg font-bold mt-4 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Köp poäng
          </AutoText>
          <AutoText
            className={`text-xs  mt-4 bg-green-500 bg-opacity-10 px-3 py-1 rounded-full `}
          >
            Premium medlemskap
          </AutoText>
        </View>

        <AutoText
          className={`text-xs mb-4 ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Välj mellan Stripe, Klarna, Apple Pay, Google Pay ... och fler !
        </AutoText>

        <View className="mt-4 flex-row flex-wrap justify-between gap-2">
          {topUps.map((topUp, index) => {
            const isLastTwo = index >= topUps.length - 2; // last two items
            const isPopular = index === 1; // Make the second option "popular"
            return (
              <Animated.View
                key={topUp.amount}
                entering={FadeIn.duration(500).delay(index * 100)}
                exiting={FadeOut.duration(500)}
                className={`relative rounded-xl overflow-hidden ${
                  isLastTwo ? "w-[48%]" : "w-[30%]"
                }`}
              >
                {isPopular && (
                  <View className="absolute top-4 right-0 z-10">
                    <View className="bg-orange-500 px-2 py-1 rounded-bl-lg rounded-tr-lg shadow-lg">
                      <AutoText className="text-white text-[8px] font-bold">
                        POPULÄR
                      </AutoText>
                    </View>
                  </View>
                )}

                <Payment
                  amount={topUp.amount }
                  points={topUp.points}
                  isDark={isDark}
                  onPaymentSuccess={handlePaymentSuccess}
                  disableAll={globalDisable}
                  setDisableAll={setGlobalDisable}
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
                  size={20}
                  color={
                    tx.type === "earned"
                      ? "#22c55e"
                      : tx.type === "spent"
                      ? "#ef4444"
                      : "#f59e0b"
                  }
                  style={{ marginRight: 6 }}
                />
                <View className="flex-1  justify-between gap-1">
                  <AutoText
                    className={`font-semibold text-sm ${
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
