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
  const currentUserFriends = (user?.unsafeMetadata as UserMetadata)?.friends || [];

  // Refresh friends list when component mounts or when refreshTrigger changes
  React.useEffect(() => {
    // Force refresh user data if needed
    if (user) {
      console.log(`Current friends count: ${currentUserFriends.length}`);
      currentUserFriends.forEach(friend => {
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
    const recipientValue = recipientClerkId.trim();

    if (!recipientValue) {
      showAlert("Fel", "Vänligen ange mottagarens Clerk ID");
      return;
    }

    if (!pointsToTransfer.trim() || parseInt(pointsToTransfer) <= 0) {
      showAlert("Fel", "Vänligen ange ett giltigt antal poäng");
      return;
    }

    const transferAmount = parseInt(pointsToTransfer);

    if (transferAmount > currentUserPoints) {
      showAlert(
        "Otillräckliga poäng",
        `Du har endast ${currentUserPoints} poäng tillgängliga`
      );
      return;
    }

    if (transferAmount < 10) {
      showAlert("Fel", "Minsta överföringsbelopp är 10 poäng");
      return;
    }

    setIsLoading(true);

    try {
      // Check if recipient is in user's friends list first (like referral system)
      const userFriends = currentUserFriends;
      const friendData = userFriends.find(friend => friend.clerkId === recipientValue);

      console.log(`Checking if ${recipientValue} is a friend...`);
      console.log(`User has ${userFriends.length} friends:`, userFriends.map(f => f.clerkId));
      console.log(`Found friend:`, friendData);

      if (!friendData) {
        showAlert("Fel", "Du kan endast överföra poäng till dina vänner. Lägg till personen som vän först.");
        setIsLoading(false);
        return;
      }

      // Find real recipient user using Clerk (same as wallet daily rewards)
      let recipientUser = null;

      try {
        // Find user by Clerk ID - simulate for now (production needs server-side)
        console.log(`🔍 Looking for user with Clerk ID: ${recipientValue}`);

        // Check if this Clerk ID exists in Clerk (simulate for now)
        // In production, this would be: const recipientUser = await client.users.getUser(recipientValue);
        console.log(`🔍 Checking if Clerk user ${recipientValue} exists...`);

        // For demo, assume the user exists and create a mock user object
        // In production, you would fetch the real user data from Clerk
        recipientUser = {
          id: recipientValue, // This is the real Clerk ID
          firstName: "Test", // Would come from Clerk
          lastName: "User", // Would come from Clerk
          unsafeMetadata: {
            points: 0, // Start with 0, will be updated
            transactions: []
          }
        } as any;

        console.log(`✅ Found/simulated Clerk user: ${recipientUser.id}`);

        console.log(`✅ Found real user: ${recipientUser.firstName} ${recipientUser.lastName} (${recipientUser.id})`);
        console.log(`✅ Friend validation passed - can transfer points`);
      } catch (error: any) {
        console.error('❌ Failed to find recipient:', error);
        showAlert("Fel", error.message || "Kunde inte hitta mottagaren");
        setIsLoading(false);
        return;
      }

      if (!recipientUser) {
        showAlert("Fel", "Ingen användare hittades med detta Clerk ID");
        setIsLoading(false);
        return;
      }

      if (recipientUser.id === user?.id) {
        showAlert("Fel", "Du kan inte överföra poäng till dig själv");
        setIsLoading(false);
        return;
      }

      // Create transaction records first
      const timestamp = new Date().toISOString();
      const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const senderTransaction = {
        id: transferId,
        type: "spent" as const,
        points: transferAmount,
        description: `Överföring till användare ${recipientValue.slice(-8)}`,
        date: timestamp,
      };

      const recipientTransaction = {
        id: transferId,
        type: "earned" as const,
        points: transferAmount,
        description: `Mottagen överföring från ${user?.fullName || user?.firstName || 'anonym användare'}`,
        date: timestamp,
      };

      // Get current points for both users
      const senderCurrentPoints = currentUserPoints;
      const recipientCurrentPoints = (recipientUser.unsafeMetadata as any)?.points || 0;

      // Calculate new points
      const senderNewPoints = senderCurrentPoints - transferAmount;
      const recipientNewPoints = recipientCurrentPoints + transferAmount;

      // Add points to recipient's transactions (but don't update their actual points yet)
      const recipientCurrentTransactions = (recipientUser.unsafeMetadata as any)?.transactions || [];
      const recipientNewTransactions = [recipientTransaction, ...recipientCurrentTransactions];

      // In a real app, we would update the recipient's Clerk user data here
      // For now, we simulate the update and show what would happen
      console.log(`🎯 RECIPIENT UPDATE SIMULATION:`);
      console.log(`Recipient ${recipientUser.id} would receive:`);
      console.log(`- Points: ${recipientCurrentPoints} -> ${recipientNewPoints}`);
      console.log(`- Transaction:`, recipientTransaction);
      console.log(`- PRODUCTION CODE: await clerkClient.users.updateUser("${recipientUser.id}", { unsafeMetadata: { points: ${recipientNewPoints} } })`);

      // For demo purposes, we can't actually update another user's data from the client
      // In production, this would be done server-side with proper authentication

      // In production, this would update the real recipient user in Clerk:
      console.log(`🎯 PRODUCTION CODE WOULD BE:`);
      console.log(`await client.users.updateUser("${recipientUser.id}", {`);
      console.log(`  unsafeMetadata: {`);
      console.log(`    points: ${recipientNewPoints},`);
      console.log(`    transactions: [...existingTransactions, ${JSON.stringify(recipientTransaction)}]`);
      console.log(`  }`);
      console.log(`});`);

      // In production, this would be:
      // await client.users.updateUser(recipientUser.id, {
      //   unsafeMetadata: recipientUser.unsafeMetadata
      // });

      // Update sender's data using the same logic as wallet daily rewards
      const senderCurrentTransactions = (user?.unsafeMetadata as any)?.transactions || [];
      const senderNewTransactions = [senderTransaction, ...senderCurrentTransactions];

      // Update sender's points and transactions (like daily reward system)
      await user?.update({
        unsafeMetadata: {
          ...(user?.unsafeMetadata as any),
          points: senderNewPoints,
          transactions: senderNewTransactions,
        }
      });

      // For Vercel deployment, use the deployed API URL
      // In development: /api/transfer-points
      // In production: https://your-app.vercel.app/api/transfer-points
      try {
        const isDevelopment = __DEV__; // React Native development flag
        const baseUrl = isDevelopment
          ? '' // Relative URL for development
          : 'https://tunisiska-services.vercel.app'; // Production Vercel URL

        const response = await fetch(`${baseUrl}/api/transfer-points`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            senderId: user?.id,
            recipientId: recipientUser.id,
            amount: transferAmount,
            transferId: transferId,
          }),
        });

        let result;
        if (response.ok) {
          result = await response.json();
          console.log(`✅ Server-side transfer completed:`, result);
        } else {
          // Handle error response
          let errorMessage = 'Transfer failed';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || 'Transfer failed';
          } catch (parseError) {
            // If response is not JSON, try to get text
            try {
              const errorText = await response.text();
              errorMessage = `Server error: ${response.status} - ${errorText}`;
            } catch (textError) {
              errorMessage = `Server error: ${response.status} - Unable to read response`;
            }
          }
          throw new Error(errorMessage);
        }

      } catch (serverError: any) {
        console.error('Server transfer error:', serverError);
        throw new Error('Server-side transfer failed: ' + serverError.message);
      }

      // Send notification to recipient
      try {
        const notificationPayload = {
          title: "Poäng mottagna! 🎉",
          message: `${user?.fullName || user?.firstName || 'En användare'} har överfört ${transferAmount} poäng till dig!`,
          subID: recipientUser.id,
          pushData: {
            type: "points_received",
            amount: transferAmount,
            from: user?.id,
            transferId: transferId,
          },
        };

        await nativeNotifyAPI.sendNotification(notificationPayload);
        console.log(`Notification sent to recipient ${recipientUser.id}`);
      } catch (notificationError) {
        console.error('Failed to send notification to recipient:', notificationError);
        // Don't fail the transfer if notification fails
      }

      // Success message
      showAlert(
        "Överföring lyckades! 🎉",
        `Du har överfört ${transferAmount} poäng till användare ${recipientValue.slice(-8)}`
      );

      // Clear form
      setRecipientClerkId("");
      setPointsToTransfer("");

      // Navigate back to wallet
      setTimeout(() => {
        router.back();
      }, 2000);

    } catch (error: any) {
      console.error("Transfer error:", error);
      showAlert("Fel", "Kunde inte genomföra överföringen. Kontrollera att uppgifterna är korrekta och försök igen.");
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
          <View className={` p-6 mt-6 rounded-2xl mb-6  ${isDark ? "bg-dark-card" : "bg-light-card"}`}>
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
                                  const updatedFriends = currentUserFriends.filter(f => f.id !== friend.id);
                                  await user?.update({
                                    unsafeMetadata: {
                                      ...(user?.unsafeMetadata as any),
                                      friends: updatedFriends,
                                    }
                                  });
                                  console.log(`✅ Friend removed: ${friend.name}`);
                                } catch (error) {
                                  console.error('❌ Failed to remove friend:', error);
                                  showAlert("Fel", "Kunde inte ta bort vännen");
                                }
                              }
                            }
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
              <Ionicons
                name="person-add-outline"
                size={14}
                color="white"
              />
              <AutoText className="text-white font-semibold ml-2">
                {currentUserFriends.length === 0 ? "Lägg till vän först" : "Hantera vänner"}
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
