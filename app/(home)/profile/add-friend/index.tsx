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

interface Friend {
  id: string;
  clerkId: string;
  name: string;
  email?: string;
  addedAt: string;
  status: "active" | "pending";
}

interface UserMetadata {
  points?: number;
  referrals?: any[];
  friends?: Friend[];
  transactions?: any[];
  lastRewardDate?: string;
  streak?: number;
}

export default function AddFriendScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const { user } = useUser();
  const { client } = useClerk();

  const [friendClerkId, setFriendClerkId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const pulse = useSharedValue(1);

  const currentUserFriends = (user?.unsafeMetadata as UserMetadata)?.friends || [];

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

  const handleAddFriend = async () => {
    const friendValue = friendClerkId.trim();

    if (!friendValue) {
      showAlert("Fel", "Vänligen ange vännen Clerk ID");
      return;
    }

    // Check if already friends
    const isAlreadyFriend = currentUserFriends.some(friend => friend.clerkId === friendValue);

    if (isAlreadyFriend) {
      showAlert("Info", "Denna person är redan din vän!");
      return;
    }

    // Prevent adding yourself
    if (friendValue === user?.id) {
      showAlert("Fel", "Du kan inte lägga till dig själv som vän");
      return;
    }

    setIsLoading(true);

    try {
      // Add friend with provided Clerk ID (this is the real Clerk ID)
      console.log(`🔍 Adding friend with Clerk ID: ${friendValue}`);

      const newFriend: Friend = {
        id: `friend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clerkId: friendValue, // This is the real Clerk ID from user input
        name: `User ${friendValue.slice(-8)}`, // Display name from Clerk ID
        addedAt: new Date().toISOString(),
        status: "active"
      };

      console.log(`✅ Friend added: ${newFriend.name} with Clerk ID: ${newFriend.clerkId}`);

      // Add friend to user's metadata
      const updatedFriends = [...currentUserFriends, newFriend];

      await user?.update({
        unsafeMetadata: {
          ...(user?.unsafeMetadata as any),
          friends: updatedFriends,
        }
      });

      console.log(`✅ Friend added: ${newFriend.name} (${newFriend.clerkId})`);

      showAlert(
        "Vän tillagd! 🎉",
        `${newFriend.name} har lagts till som vän. Du kan nu överföra poäng till varandra!`
      );

      // Clear form
      setFriendClerkId("");

      // Navigate back to transfer points
      setTimeout(() => {
        router.back();
      }, 2000);

    } catch (error: any) {
      console.error("Add friend error:", error);
      showAlert("Fel", "Kunde inte lägga till vännen. Kontrollera uppgifterna och försök igen.");
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
            Vänner
          </AutoText>
        </View>
        <AutoText
          className={`text-sm text-center ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Lägg till vänner för att kunna överföra poäng
        </AutoText>
      </View>

      <ScrollView
        className=" mt-4 px-6 "
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Friends Count Card */}
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
                  Dina vänner
                </AutoText>
                <AutoText
                  className={`text-4xl font-extrabold mb-2 ${
                    isDark ? "text-white" : "text-dark"
                  }`}
                >
                  {currentUserFriends.length}
                </AutoText>
                <AutoText
                  className={` mt-1 ${isDark ? "text-white" : "text-dark"}`}
                >
                  {currentUserFriends.length === 1
                    ? "vän"
                    : "vänner"}
                </AutoText>
              </View>
              <View
                className={`p-3 rounded-xl ${isDark ? "bg-white/20" : "bg-black/20"}`}
              >
                <Ionicons
                  name="people"
                  size={28}
                  color={isDark ? "#fff" : "#000"}
                />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>


        {/* Add Friend Form */}
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
              Lägg till vän
            </AutoText>

            <AutoText
              className={`my-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Vännens Clerk ID *
            </AutoText>
            <Input
              placeholder="user_2abc123..."
              value={friendClerkId}
              onChangeText={setFriendClerkId}
              className={`border rounded-lg p-4 mb-4 ${
                isDark
                  ? "bg-dark-card text-white border-gray-600"
                  : "bg-light-card text-black border-gray-300"
              }`}
              placeholderTextColor={isDark ? "gray" : "gray"}
            />

            <View
              className={`p-3 rounded-lg ${isDark ? "bg-green-500/10" : "bg-green-50"}`}
            >
              <AutoText
                className={`text-sm ${isDark ? "text-green-300" : "text-green-700"}`}
              >
                💡 Efter att du lagt till en vän kan ni överföra poäng till varandra
              </AutoText>
            </View>
          </View>
        </Animated.View>

        {/* Add Friend Button */}
        <Animated.View entering={ZoomIn.delay(600)}>
          <TouchableOpacity
            onPress={handleAddFriend}
            disabled={isLoading}
            className={`bg-green-500 rounded-2xl p-4 items-center mb-6 ${
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
                name={isLoading ? "hourglass-outline" : "person-add-outline"}
                size={14}
                color="white"
              />
              <AutoText className="text-white font-semibold ml-2">
                {isLoading ? "Lägger till..." : "Lägg till vän"}
              </AutoText>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}