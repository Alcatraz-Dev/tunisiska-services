import React, { useState } from "react";
import { View, TouchableOpacity, ScrollView, Alert, Image } from "react-native";
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
  imageUrl?: string;
  addedAt: string;
  status: "active" | "pending";
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserImageUrl?: string;
  fromUserPoints?: number;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

interface UserMetadata {
  points?: number;
  referrals?: any[];
  friends?: Friend[];
  friendRequests?: FriendRequest[];
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

  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");
  const [refreshKey, setRefreshKey] = useState(0);
  const [friendClerkId, setFriendClerkId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const pulse = useSharedValue(1);

  const currentUserFriends =
    (user?.unsafeMetadata as UserMetadata)?.friends || [];
  const currentFriendRequests =
    (user?.unsafeMetadata as UserMetadata)?.friendRequests || [];

  // Get points from Sanity as the source of truth
  const [currentUserPoints, setCurrentUserPoints] = useState(0);

  // Load user's current points from Sanity on component mount
  React.useEffect(() => {
    const loadUserPoints = async () => {
      if (user?.id) {
        try {
          const { client } = await import("@/sanityClient");
          const userDoc = await client.fetch(
            `*[_type == "users" && clerkId == $clerkId][0]`,
            { clerkId: user.id }
          );
          const sanityPoints = userDoc?.points || 0;
          setCurrentUserPoints(sanityPoints);

          // Sync Clerk metadata with Sanity points
          const metadataPoints = (user.unsafeMetadata as any)?.points || 0;
          if (metadataPoints !== sanityPoints) {
            await user.update({
              unsafeMetadata: {
                ...(user.unsafeMetadata as any),
                points: sanityPoints,
              },
            });
          }
        } catch (error) {
          console.error("Error loading user points from Sanity:", error);
          // Fallback to metadata
          setCurrentUserPoints((user?.unsafeMetadata as any)?.points || 0);
        }
      }
    };

    loadUserPoints();
  }, [user?.id]);

  // Filter incoming requests (requests sent TO current user)
  const incomingRequests = currentFriendRequests.filter(
    (request: FriendRequest) =>
      request.toUserId === user?.id && request.status === "pending"
  );

  // Filter outgoing requests (requests sent BY current user)
  const outgoingRequests = currentFriendRequests.filter(
    (request: FriendRequest) =>
      request.fromUserId === user?.id && request.status === "pending"
  );

  // Load friend requests from Sanity
  const loadFriendRequestsFromSanity = async () => {
    try {
      const { client } = await import("@/sanityClient");
      const requests = await client.fetch(
        `*[_type == "friendRequest" && (fromUserId == $userId || toUserId == $userId)] | order(createdAt desc)`,
        { userId: user?.id }
      );

      // Update user's metadata with latest requests (limit to prevent size issues)
      if (requests.length > 0) {
        // Limit to last 50 requests to prevent metadata size issues
        const recentRequests = requests.slice(0, 50);

        // Get sender and receiver information for each request
        const requestsWithInfo = await Promise.all(
          recentRequests.map(async (req: any) => {
            // Use data from Sanity, with fallbacks for missing info
            let senderName =
              req.fromUserName || `User ${req.fromUserId.slice(-8)}`;
            let senderImageUrl = req.fromUserImageUrl;
            let senderPoints = req.fromUserPoints || 0;

            let receiverName =
              req.toUserName || `User ${req.toUserId.slice(-8)}`;
            let receiverImageUrl = req.toUserImageUrl;

            return {
              id: req._id,
              fromUserId: req.fromUserId,
              fromUserName: senderName,
              fromUserImageUrl: senderImageUrl,
              fromUserPoints: senderPoints,
              toUserId: req.toUserId,
              toUserName: receiverName,
              toUserImageUrl: receiverImageUrl,
              pointsToTransfer: req.pointsToTransfer || 0,
              status: req.status,
              createdAt: req.createdAt,
            };
          })
        );

        await user?.update({
          unsafeMetadata: {
            ...(user?.unsafeMetadata as any),
            friendRequests: requestsWithInfo,
          },
        });
      }
    } catch (error) {
      console.error("Error loading friend requests from Sanity:", error);
    }
  };

  // Load friends from Sanity
  const loadFriendsFromSanity = async () => {
    try {
      const { client } = await import("@/sanityClient");

      // Find all accepted friend requests where current user is involved
      const friendRequests = await client.fetch(
        `*[_type == "friendRequest" && status == "accepted" && (fromUserId == $userId || toUserId == $userId)]`,
        { userId: user?.id }
      );

      // Extract friend information from accepted requests
      const friends = await Promise.all(
        friendRequests.map(async (req: any) => {
          const isFromUser = req.fromUserId === user?.id;
          const friendClerkId = isFromUser ? req.toUserId : req.fromUserId;
          const friendName = isFromUser ? req.toUserName : req.fromUserName;
          const friendImageUrl = isFromUser
            ? req.toUserImageUrl
            : req.fromUserImageUrl;

          return {
            id: `friend_${req._id}`,
            clerkId: friendClerkId,
            name: friendName || `User ${friendClerkId.slice(-8)}`,
            imageUrl: friendImageUrl,
            addedAt: req.updatedAt || req.createdAt,
            status: "active",
          };
        })
      );

      // Update user's friends list in metadata (limit to prevent size issues)
      const limitedFriends = friends.slice(0, 100); // Limit to 100 friends

      await user?.update({
        unsafeMetadata: {
          ...(user?.unsafeMetadata as any),
          friends: limitedFriends,
        },
      });
    } catch (error) {
      console.error("Error loading friends from Sanity:", error);
    }
  };

  // Load friend requests and friends on component mount and periodically
  React.useEffect(() => {
    if (user?.id) {
      loadFriendRequestsFromSanity();
      loadFriendsFromSanity();

      // Check for updates every 3 seconds
      const interval = setInterval(() => {
        loadFriendRequestsFromSanity();
        loadFriendsFromSanity();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [user?.id]);

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

  const handleSendFriendRequest = async () => {
    const friendValue = friendClerkId.trim();

    if (!friendValue) {
      showAlert("Fel", "Vänligen ange vännen Clerk ID");
      return;
    }

    // Check if already friends
    const isAlreadyFriend = currentUserFriends.some(
      (friend) => friend.clerkId === friendValue
    );

    if (isAlreadyFriend) {
      showAlert("Info", "Denna person är redan din vän!");
      return;
    }

    // Check if request already sent
    const existingRequest = currentFriendRequests.find(
      (req) =>
        req.fromUserId === user?.id &&
        req.toUserId === friendValue &&
        req.status === "pending"
    );

    if (existingRequest) {
      showAlert(
        "Info",
        "Du har redan skickat en vänförfrågan till denna person!"
      );
      return;
    }

    // Prevent adding yourself
    if (friendValue === user?.id) {
      showAlert("Fel", "Du kan inte lägga till dig själv som vän");
      return;
    }

    setIsLoading(true);

    try {
      console.log(`Sending friend request to: ${friendValue}`);

      // Create friend request in Sanity
      const { client } = await import("@/sanityClient");

      const friendRequestData = {
        _type: "friendRequest",
        fromUserId: user?.id || "",
        fromUserName:
          user?.fullName || user?.firstName || `User ${user?.id?.slice(-8)}`,
        fromUserImageUrl: user?.imageUrl || null,
        fromUserPoints: (user?.unsafeMetadata as any)?.points || 0,
        toUserId: friendValue,
        pointsToTransfer: 0, // Will be set when sending points
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await client.create(friendRequestData);
      console.log("✅ Friend request created in Sanity:", result._id);

      // Update local metadata with the new request
      const friendRequest: FriendRequest = {
        id: result._id,
        fromUserId: user?.id || "",
        fromUserName:
          user?.fullName || user?.firstName || `User ${user?.id?.slice(-8)}`,
        fromUserImageUrl: user?.imageUrl || undefined,
        fromUserPoints: currentUserPoints,
        toUserId: friendValue,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      // Add to sender's outgoing requests in metadata (limit size)
      const existingRequests =
        (user?.unsafeMetadata as any)?.friendRequests || [];
      const updatedRequests = [...existingRequests, friendRequest];

      // Keep only the most recent 50 requests to prevent size issues
      const limitedRequests = updatedRequests.slice(-50);

      await user?.update({
        unsafeMetadata: {
          ...(user?.unsafeMetadata as any),
          friendRequests: limitedRequests,
        },
      });

      console.log(`✅ Friend request sent to: ${friendValue}`);

      showAlert(
        "Vänförfrågan skickad! 🎉",
        `Din vänförfrågan har skickats till användaren. De måste acceptera den för att bli vänner.`
      );

      // Clear form and trigger re-render
      setFriendClerkId("");
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      console.error("Send friend request error:", error);
      showAlert(
        "Fel",
        error.message ||
          "Kunde inte skicka vänförfrågan. Kontrollera uppgifterna och försök igen."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    if (!user) return;

    setIsLoading(true);

    try {
      const { client } = await import("@/sanityClient");

      // Update friend request status in Sanity
      await client
        .patch(request.id)
        .set({
          status: "accepted",
          toUserName:
            user?.fullName || user?.firstName || `User ${user?.id?.slice(-8)}`,
          toUserImageUrl: user?.imageUrl || null,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      // Award points based on pointsToTransfer field
      const pointsToAward = request.pointsToTransfer || 0;

      if (pointsToAward > 0) {
        // Get current points from Sanity (source of truth)
        const currentPoints = currentUserPoints;

        // Add the points to transfer to user's points
        const newPoints = currentPoints + pointsToAward;

        // Update Clerk metadata with new total points
        await user?.update({
          unsafeMetadata: {
            ...(user?.unsafeMetadata as any),
            points: newPoints,
          },
        });

        // Update points in Sanity
        const userDoc = await client.fetch(
          `*[_type == "users" && clerkId == $clerkId][0]`,
          { clerkId: user.id }
        );

        if (userDoc) {
          await client.patch(userDoc._id).set({ points: newPoints }).commit();
        }

        // Update points in Sanity for the user
        const userData = await client.fetch(
          `*[_type == "users" && clerkId == $userClerkId][0]`,
          { userClerkId: user.id }
        );

        if (userData) {
          await client.patch(userData._id).set({ points: newPoints }).commit();
        } else {
          // Create user document in Sanity if it doesn't exist
          await client.create({
            _type: "users",
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress || "",
            points: newPoints,
          });
        }

        console.log(
          `✅ Points updated: ${currentPoints} -> ${newPoints} (+${pointsToAward} from ${request.fromUserName})`
        );

        // Add transaction record (limit transactions to prevent size issues)
        const transactions = (user?.unsafeMetadata as any)?.transactions || [];
        transactions.unshift({
          id: `friend_points_${Date.now()}`,
          type: "earned",
          points: pointsToAward,
          description: `Mottagit poäng från ${request.fromUserName}`,
          date: new Date().toISOString(),
        });

        // Keep only the last 50 transactions
        const limitedTransactions = transactions.slice(0, 50);

        await user?.update({
          unsafeMetadata: {
            ...(user?.unsafeMetadata as any),
            transactions: limitedTransactions,
          },
        });
      }

      // Add friend to user's friends list
      const newFriend = {
        id: `friend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clerkId: request.fromUserId,
        name: request.fromUserName,
        imageUrl: request.fromUserImageUrl,
        addedAt: new Date().toISOString(),
        status: "active",
      };

      const currentFriends =
        (user.unsafeMetadata as UserMetadata)?.friends || [];
      const updatedFriends = [...currentFriends, newFriend];

      // Update friend request status in metadata
      const updatedRequests = currentFriendRequests.map((req: FriendRequest) =>
        req.id === request.id ? { ...req, status: "accepted" } : req
      );

      // Keep only the most recent 50 requests and 100 friends
      const limitedRequests = updatedRequests.slice(-50);
      const limitedFriends = updatedFriends.slice(0, 100);

      await user.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata as any),
          friends: limitedFriends,
          friendRequests: limitedRequests,
        },
      });

      const pointsMessage =
        pointsToAward > 0
          ? `Du har fått ${pointsToAward} poäng från ${request.fromUserName}! `
          : "";
      showAlert(
        "Vänförfrågan accepterad!",
        `${pointsMessage}Du och ${request.fromUserName} är nu vänner!`
      );

      // Trigger re-render to update counts
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      console.error("Accept request error:", error);
      showAlert("Fel", "Kunde inte acceptera vänförfrågan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRequest = async (request: FriendRequest) => {
    if (!user) return;

    try {
      const { client } = await import("@/sanityClient");

      // Delete friend request from Sanity when rejected
      await client.delete(request.id);

      // Remove friend request from metadata (limit size)
      const updatedRequests = currentFriendRequests.filter(
        (req: FriendRequest) => req.id !== request.id
      );

      // Keep only the most recent 50 requests
      const limitedRequests = updatedRequests.slice(-50);

      await user.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata as any),
          friendRequests: limitedRequests,
        },
      });

      showAlert(
        "Vänförfrågan avvisad",
        `Du har avvisat vänförfrågan från ${request.fromUserName}`
      );

      // Trigger re-render to update counts
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      console.error("Reject request error:", error);
      showAlert("Fel", "Kunde inte avvisa vänförfrågan");
    }
  };

  interface FriendRequest {
    id: string;
    fromUserId: string;
    fromUserName: string;
    fromUserImageUrl?: string;
    fromUserPoints?: number;
    toUserId: string;
    toUserName?: string;
    toUserImageUrl?: string;
    pointsToTransfer?: number;
    status: "pending" | "accepted" | "rejected";
    createdAt: string;
  }

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
        {/* Tab Navigation */}
        <Animated.View entering={FadeInUp.duration(600)} className="mb-6">
          <View
            className={`flex-row rounded-2xl p-1 ${isDark ? "bg-dark-card" : "bg-light-card"}`}
          >
            <TouchableOpacity
              onPress={() => setActiveTab("friends")}
              className={`flex-1 py-3 px-4 rounded-xl ${
                activeTab === "friends" ? "bg-primary" : "transparent"
              }`}
            >
              <AutoText
                className={`text-center font-semibold ${
                  activeTab === "friends"
                    ? "text-white"
                    : isDark
                      ? "text-gray-400"
                      : "text-gray-600"
                }`}
              >
                Vänner ({currentUserFriends.length})
              </AutoText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("requests")}
              className={`flex-1 py-3 px-4 rounded-xl ${
                activeTab === "requests" ? "bg-primary" : "transparent"
              }`}
            >
              <AutoText
                className={`text-center font-semibold ${
                  activeTab === "requests"
                    ? "text-white"
                    : isDark
                      ? "text-gray-400"
                      : "text-gray-600"
                }`}
              >
                Förfrågningar ({incomingRequests.length})
              </AutoText>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Friends Tab */}
        {activeTab === "friends" && (
          <>
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
                      {currentUserFriends.length === 1 ? "vän" : "vänner"}
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
              <View
                className={` p-6 mt-6 rounded-2xl mb-6  ${isDark ? "bg-dark-card" : "bg-light-card"}`}
              >
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
                    💡 Skicka en vänförfrågan så kan ni överföra poäng till
                    varandra efter acceptans
                  </AutoText>
                </View>

                {/* Send Friend Request Button */}
                <TouchableOpacity
                  onPress={handleSendFriendRequest}
                  disabled={isLoading}
                  className={`bg-green-500 rounded-2xl p-4 items-center mt-4 ${
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
                      name={
                        isLoading ? "hourglass-outline" : "person-add-outline"
                      }
                      size={14}
                      color="white"
                    />
                    <AutoText className="text-white font-semibold ml-2">
                      {isLoading ? "Skickar..." : "Skicka vänförfrågan"}
                    </AutoText>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Friends List */}
            <Animated.View entering={FadeInUp.delay(700)} className="mt-6">
              <AutoText
                className={`text-lg font-bold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Dina vänner ({currentUserFriends.length})
              </AutoText>
              {currentUserFriends.length > 0 ? (
                currentUserFriends.map((friend, index) => (
                  <View
                    key={friend.id}
                    className={`p-4 rounded-xl mb-3 ${
                      isDark ? "bg-dark-card" : "bg-light-card"
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-full bg-gray-300 mr-3 overflow-hidden">
                          {friend.imageUrl ? (
                            <Image
                              source={{ uri: friend.imageUrl }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-full h-full bg-gray-400 items-center justify-center">
                              <AutoText className="text-white font-bold text-lg">
                                {friend.name.charAt(0).toUpperCase()}
                              </AutoText>
                            </View>
                          )}
                        </View>
                        <View className="flex-1">
                          <View className="flex flex-row justify-between items-center my-1">
                            <AutoText
                              className={`font-semibold ${
                                isDark ? "text-white" : "text-gray-900"
                              }`}
                            >
                              {friend.name}
                            </AutoText>
                            <View className="flex-row items-center gap-2">
                            <View
                              className={`px-2 py-1 rounded-full ${
                                friend.status === "active"
                                  ? "bg-green-100"
                                  : "bg-yellow-100"
                              }`}
                            >
                              <AutoText
                                className={`text-xs font-medium ${
                                  friend.status === "active"
                                    ? "text-green-700"
                                    : "text-yellow-700"
                                }`}
                              >
                                {friend.status === "active"
                                  ? "Aktiv"
                                  : "Väntar"}
                              </AutoText>
                              
                            </View>
                          
                              <TouchableOpacity
                                onPress={() => {
                                  showAlert(
                                    "Ta bort vän",
                                    `Är du säker på att du vill ta bort ${friend.name} från dina vänner? Detta kommer också att ta bort vänförhållandet från databasen.`,
                                    [
                                      { text: "Avbryt", style: "cancel" },
                                      {
                                        text: "Ta bort",
                                        style: "destructive",
                                        onPress: async () => {
                                          try {
                                            const { client } = await import(
                                              "@/sanityClient"
                                            );

                                            // Find and delete the friend request from Sanity
                                            const friendRequest =
                                              await client.fetch(
                                                `*[_type == "friendRequest" && status == "accepted" && ((fromUserId == $userId && toUserId == $friendId) || (fromUserId == $friendId && toUserId == $userId))][0]`,
                                                {
                                                  userId: user?.id,
                                                  friendId: friend.clerkId,
                                                }
                                              );

                                            if (friendRequest) {
                                              await client.delete(
                                                friendRequest._id
                                              );
                                            }

                                            // Remove friend from local metadata
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
                                            showAlert(
                                              "Vän borttagen",
                                              `${friend.name} har tagits bort från dina vänner.`
                                            );
                                          } catch (error) {
                                            console.error(
                                              "❌ Failed to remove friend:",
                                              error
                                            );
                                            showAlert(
                                              "Fel",
                                              "Kunde inte ta bort vännen"
                                            );
                                          }
                                        },
                                      },
                                    ]
                                  );
                                }}
                                className="p-2 rounded-full bg-red-500/10 "
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={16}
                                  color="#ef4444"
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                       
                            <AutoText
                              className={`text-xs ${
                                isDark ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              {friend.clerkId}
                            </AutoText>
                            
    
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View
                  className={`p-8 rounded-2xl items-center justify-center ${
                    isDark ? "bg-dark-card" : "bg-light-card"
                  }`}
                >
                  <Ionicons
                    name="people-outline"
                    size={48}
                    color={isDark ? "#9ca3af" : "#6b7280"}
                  />
                  <AutoText
                    className={`mt-4 text-lg font-semibold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Inga vänner än
                  </AutoText>
                  <AutoText
                    className={`mt-2 text-center ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Skicka vänförfrågningar för att börja överföra poäng till
                    varandra
                  </AutoText>
                </View>
              )}
            </Animated.View>
          </>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <View key={refreshKey}>
            {/* Friend Requests Section */}
            {incomingRequests.length > 0 && (
              <Animated.View entering={FadeInUp.delay(500)} className="mt-6">
                <AutoText
                  className={`text-lg font-bold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Inkommande förfrågningar ({incomingRequests.length})
                </AutoText>
                {incomingRequests.map((request, index) => (
                  <View
                    key={request.id}
                    className={`p-4 rounded-xl mb-3 ${
                      isDark ? "bg-dark-card" : "bg-light-card"
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1">
                        <View className="w-12 h-12 rounded-full bg-gray-300 mr-3 overflow-hidden">
                          {request.fromUserImageUrl ? (
                            <Image
                              source={{ uri: request.fromUserImageUrl }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="w-full h-full bg-gray-400 items-center justify-center">
                              <AutoText className="text-white font-bold text-lg">
                                {request.fromUserName.charAt(0).toUpperCase()}
                              </AutoText>
                            </View>
                          )}
                        </View>
                        <View className="flex-1">
                          <AutoText
                            className={`font-semibold text-lg ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {request.fromUserName}
                          </AutoText>
                          <AutoText
                            className={`text-sm ${
                              isDark ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            {request.fromUserId}
                          </AutoText>
                          <AutoText
                            className={`text-xs mt-1 ${
                              isDark ? "text-gray-500" : "text-gray-500"
                            }`}
                          >
                            {new Date(request.createdAt).toLocaleDateString(
                              "sv-SE"
                            )}
                          </AutoText>
                          {request.fromUserPoints !== undefined && (
                            <AutoText
                              className={`text-xs mt-1 ${
                                isDark ? "text-blue-300" : "text-blue-600"
                              }`}
                            >
                              {request.fromUserPoints} poäng
                            </AutoText>
                          )}
                        </View>
                      </View>
                    </View>

                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => handleAcceptRequest(request)}
                        disabled={isLoading}
                        className="flex-1 bg-green-500 p-3 rounded-xl items-center"
                      >
                        <AutoText className="text-white font-semibold">
                          Acceptera
                        </AutoText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRejectRequest(request)}
                        disabled={isLoading}
                        className="flex-1 bg-red-500 p-3 rounded-xl items-center"
                      >
                        <AutoText className="text-white font-semibold">
                          Avvisa
                        </AutoText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <Animated.View entering={FadeInUp.delay(700)} className="mt-6">
                <AutoText
                  className={`text-lg font-bold mb-4 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Skickade förfrågningar ({outgoingRequests.length})
                </AutoText>
                {outgoingRequests.map((request, index) => (
                  <View
                    key={request.id}
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
                          Till: {request.toUserId.slice(-8)}
                        </AutoText>
                        <AutoText
                          className={`text-sm ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {new Date(request.createdAt).toLocaleDateString(
                            "sv-SE"
                          )}
                        </AutoText>
                      </View>
                      <View
                        className={`px-2 py-1 rounded-full ${
                          request.status === "pending"
                            ? "bg-yellow-100"
                            : request.status === "accepted"
                              ? "bg-green-100"
                              : "bg-red-100"
                        }`}
                      >
                        <AutoText
                          className={`text-xs font-medium ${
                            request.status === "pending"
                              ? "text-yellow-700"
                              : request.status === "accepted"
                                ? "text-green-700"
                                : "text-red-700"
                          }`}
                        >
                          {request.status === "pending"
                            ? "Väntar"
                            : request.status === "accepted"
                              ? "Accepterad"
                              : "Avvisad"}
                        </AutoText>
                      </View>
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
              <Animated.View entering={FadeInUp.delay(500)} className="mt-6">
                <View
                  className={`p-8 rounded-2xl items-center justify-center ${
                    isDark ? "bg-dark-card" : "bg-light-card"
                  }`}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={48}
                    color={isDark ? "#9ca3af" : "#6b7280"}
                  />
                  <AutoText
                    className={`mt-4 text-lg font-semibold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Inga vänförfrågningar
                  </AutoText>
                  <AutoText
                    className={`mt-2 text-center ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Du har inga väntande vänförfrågningar just nu
                  </AutoText>
                </View>
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}
