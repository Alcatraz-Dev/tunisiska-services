import React, { useState } from "react";
import { View, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useUser, useClerk } from "@clerk/clerk-expo";
import { AutoText } from "@/app/components/ui/AutoText";
import Input from "@/app/components/ui/Input";
import { showAlert } from "@/app/utils/showAlert";
import { getPremiumGradient } from "@/app/utils/getPremiumGradient";
import { LinearGradient } from "expo-linear-gradient";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from "react-native-reanimated";

interface Referral {
  id: string;
  clerkId: string;
  name: string;
  joinedAt: string;
  status: "pending" | "completed" | "active";
  pointsEarned: number;
}

interface Friend {
  id: string;
  clerkId: string;
  name: string;
  email?: string;
  addedAt: string;
  status: "active" | "pending";
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
  friends?: Friend[];
  transactions?: Transaction[];
  lastRewardDate?: string;
  streak?: number;
}

export default function TransferPointsScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { user } = useUser();
  const { client } = useClerk();
  const [recipientClerkId, setRecipientClerkId] = useState("");
  const [pointsToTransfer, setPointsToTransfer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pulse = useSharedValue(1);

  const currentUserPoints = (user?.unsafeMetadata as any)?.points || 0;
  const currentUserFriends =
    (user?.unsafeMetadata as UserMetadata)?.friends || [];

  // Refresh friends list when component mounts or when refreshTrigger changes
  React.useEffect(() => {
    // Force refresh user data if needed
    if (user) {
      console.log(`Current friends count: ${currentUserFriends.length}`);
      currentUserFriends.forEach((friend) => {
        console.log(`Friend: ${friend.name} (${friend.clerkId})`);
      });
    }
  }, [user, refreshTrigger, currentUserFriends]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withSpring(1.1), withSpring(0.9)),
      -1,
      true
    );
  }, []);

const handleTransfer = async () => {
  if (!user) return;

  setIsLoading(true);

  try {
    const res = await fetch("/api/transfer-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: user.id,
        receiverId: recipientClerkId.trim(),
        amount: parseInt(pointsToTransfer),
      }),
    });

    const data = await res.json();

    if (res.ok) {
      showAlert("Success", `You transferred ${pointsToTransfer} points!`);
      setPointsToTransfer("");
      setRecipientClerkId("");
    } else {
      showAlert("Error", data.error);
    }
  } catch (error: any) {
    console.error(error);
    showAlert("Error", "Transfer failed");
  } finally {
    setIsLoading(false);
  }
};
  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      {/* Header */}
      <View className="p-6">
        <View className="flex-row items-center justify-center mb-6 relative">
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
            className={`text-2xl font-extrabold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Överför poäng
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Överför poäng till andra användare
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
                  Dina poäng
                </AutoText>
                <AutoText
                  className={`text-4xl font-extrabold mb-2 ${
                    isDark ? "text-white" : "text-dark"
                  }`}
                >
                  {currentUserPoints} poäng
                </AutoText>
                <AutoText
                  className={` mt-1 ${isDark ? "text-white" : "text-dark"}`}
                >
                  {currentUserPoints > 0
                    ? `≈ ${(currentUserPoints / 100) * 10} kr`
                    : "Inget värde ännu"}
                </AutoText>
              </View>
              <View
                className={`p-3 rounded-xl ${isDark ? "bg-white/20" : "bg-black/20"}`}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={28}
                  color={isDark ? "#fff" : "#000"}
                />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Transfer Form */}
        <Animated.View
          entering={FadeInUp.delay(500)}
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <View
            className={` p-6 mt-6 rounded-2xl mb-6  ${isDark ? "bg-dark-card" : "bg-light-card"}`}
          >
            <AutoText
              className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Överföringsdetaljer
            </AutoText>

            <AutoText
              className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Mottagarens Clerk ID *
            </AutoText>
            <Input
              placeholder="user_2abc123..."
              value={recipientClerkId}
              onChangeText={setRecipientClerkId}
              className={`border rounded-lg p-4 mb-4 ${
                isDark
                  ? "bg-dark-card text-white border-gray-600"
                  : "bg-light-card text-black border-gray-300"
              }`}
              placeholderTextColor={isDark ? "gray" : "gray"}
            />

            <AutoText
              className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Antal poäng att överföra *
            </AutoText>
            <Input
              placeholder="Minst 10 poäng"
              keyboardType="numeric"
              value={pointsToTransfer}
              onChangeText={setPointsToTransfer}
              className={`border rounded-lg p-4 mb-4 ${
                isDark
                  ? "bg-dark-card text-white border-gray-600"
                  : "bg-light-card text-black border-gray-300"
              }`}
              placeholderTextColor={isDark ? "gray" : "gray"}
            />

            <View
              className={`p-3 rounded-lg ${isDark ? "bg-blue-500/10" : "bg-blue-50"}`}
            >
              <AutoText
                className={`text-sm ${isDark ? "text-blue-300" : "text-blue-700"}`}
              >
                💡 Minsta överföringsbelopp: 10 poäng
              </AutoText>
            </View>
          </View>
        </Animated.View>

        {/* Friends List with Delete */}
        {currentUserFriends.length > 0 && (
          <Animated.View entering={FadeInUp.delay(700)} className="mt-6">
            <AutoText
              className={`text-lg font-bold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Dina vänner ({currentUserFriends.length})
            </AutoText>
            {currentUserFriends.map((friend, index) => (
              <View
                key={friend.id}
                className={`p-4 rounded-xl mb-3 ${
                  isDark ? "bg-dark-card" : "bg-light-card"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <AutoText
                      className={`font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {friend.name}
                    </AutoText>
                    <AutoText
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {friend.clerkId}
                    </AutoText>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View
                      className={`px-2 py-1 rounded-full ${
                        friend.status === "active"
                          ? "bg-green-100"
                          : "bg-yellow-100"
                      }`}
                    >
                      <AutoText
                        className={`text-xs ${
                          friend.status === "active"
                            ? "text-green-700"
                            : "text-yellow-700"
                        }`}
                      >
                        {friend.status === "active" ? "Aktiv" : "Väntar"}
                      </AutoText>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        showAlert(
                          "Ta bort vän",
                          `Är du säker på att du vill ta bort ${friend.name} från dina vänner?`,
                          [
                            { text: "Avbryt", style: "cancel" },
                            {
                              text: "Ta bort",
                              style: "destructive",
                              onPress: async () => {
                                try {
                                  const updatedFriends =
                                    currentUserFriends.filter(
                                      (f) => f.id !== friend.id
                                    );
                                  await user?.update({
                                    unsafeMetadata: {
                                      ...(user?.unsafeMetadata as any),
                                      friends: updatedFriends,
                                    },
                                  });
                                  console.log(
                                    `✅ Friend removed: ${friend.name}`
                                  );
                                } catch (error) {
                                  console.error(
                                    "❌ Failed to remove friend:",
                                    error
                                  );
                                  showAlert("Fel", "Kunde inte ta bort vännen");
                                }
                              },
                            },
                          ]
                        );
                      }}
                      className="p-2 rounded-full bg-red-500/10"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Add Friend Button */}
        <Animated.View entering={ZoomIn.delay(800)}>
          <TouchableOpacity
            onPress={() => router.push("/(home)/profile/add-friend")}
            className={`bg-green-500 rounded-2xl p-4 items-center mb-4 ${
              isLoading ? "opacity-50" : ""
            }`}
            style={{
              shadowColor: "#10B981",
              shadowOpacity: 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 5 },
              elevation: 8,
            }}
          >
            <View className="flex-row items-center">
              <Ionicons name="person-add-outline" size={14} color="white" />
              <AutoText className="text-white font-semibold ml-2">
                {currentUserFriends.length === 0
                  ? "Lägg till vän först"
                  : "Hantera vänner"}
              </AutoText>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Transfer Button */}
        <Animated.View entering={ZoomIn.delay(600)}>
          <TouchableOpacity
            onPress={handleTransfer}
            disabled={isLoading || currentUserFriends.length === 0}
            className={`bg-primary rounded-2xl p-4 items-center mb-6 ${
              isLoading || currentUserFriends.length === 0 ? "opacity-50" : ""
            }`}
            style={{
              shadowColor: "#3B82F6",
              shadowOpacity: 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 5 },
              elevation: 8,
            }}
          >
            <View className="flex-row items-center">
              <Ionicons
                name={isLoading ? "hourglass-outline" : "send-outline"}
                size={14}
                color={isDark ? "#fff" : "#fff"}
              />
              <AutoText className="text-white font-semibold ml-2">
                {isLoading ? "Överför..." : "Överför poäng"}
              </AutoText>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
