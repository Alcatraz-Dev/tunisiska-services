import { SignedIn, useAuth, useUser } from "@clerk/clerk-expo";
import {
  getUnreadNotificationInboxCount,
  getNotificationInbox,
} from "native-notify";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, TouchableOpacity, View, Platform } from "react-native";
import * as Device from "expo-device";
import { SafeAreaView } from "react-native-safe-area-context";
import AnnouncementsCarousel from "../components/AnnouncementsCarousel";
import AppFooter from "../components/AppFooter";
import LiveStatus from "../components/LiveStatus";
import ServiceCard from "../components/ServiceCard";
import { useNotifications } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";
import { getGreeting } from "../utils/getGreeting";
import CategoryTabs from "./CategoryTabs";
import RedirectIfSignedOut from "./RedirectIfSignedOut";
import { AutoText } from "./ui/AutoText";
import Input from "./ui/Input";
import { createUserDirectInSanity } from "../utils/sanityDirect";

interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string;
  country: string;
  city?: string;
}

const services = [
  {
    id: "1",
    title: "Shipping mellan Sverige & Tunisien",
    description: "Snabb och säker frakt av paket mellan Sverige och Tunisien.",
    icon: "cube-outline",
    color: "#3B82F6",
    route: "/(home)/services/shipping",
    category: "Transport",
  },
  {
    id: "2",
    title: "Hemstädning + Flytt",
    description: "Boka professionell hemstädning med flytthjälp.",
    icon: "home-outline",
    color: "#10B981",
    route: "/(home)/services/cleaning-move",
    category: "Städning & FlyttServices",
  },
  {
    id: "3",
    title: "Flytt utan städning",
    description: "Enkel flytthjälp för att flytta möbler och tillhörigheter.",
    icon: "cube",
    color: "#F59E0B",
    route: "/(home)/services/move",
    category: "FlyttServices",
  },
  {
    id: "4",
    title: "Taxi till flygplats",
    description: "Boka transport till och från flygplatser.",
    icon: "car-outline",
    color: "#EF4444",
    route: "/(home)/services/taxi",
    category: "Flygplats Taxi",
  },
];

const categories = [
  "Alla",
  "Transport",
  "Städning & FlyttServices",
  "FlyttServices",
  "Flygplats Taxi",
];

export default function HomePage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { isLoaded, user } = useUser();
  const { isLoaded: isAuthLoaded, userId } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Alla");
  const [imageUrl, setImageUrl] = useState("");
  const { notifications, notificationsEnabled } = useNotifications();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const READ_IDS_KEY = useMemo(() => `notification_read_ids:${userId ?? "anon"}`, [userId]);
  const HIDDEN_IDS_KEY = useMemo(() => `notification_hidden_ids:${userId ?? "anon"}`, [userId]);

  const router = useRouter();

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userCreated, setUserCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getId = (n: any) => (n.id ?? n.notification_id ?? '').toString();
  const filterForUser = (items: any[]) => {
    if (!userId) return items;
    const keys = ['subscriber_id','subscriberId','user_id','userId','indie_id','indieId','sub_id','subId'];
    const hasAny = items.some((it) => keys.some((k) => it && typeof it === 'object' && k in it));
    if (!hasAny) return items;
    return items.filter((it) => keys.some((k) => it?.[k]?.toString?.() === userId?.toString()))
  };
  const applyOverlays = (items: any[], read: string[], hidden: string[]) => {
    const readSet = new Set(read);
    const hiddenSet = new Set(hidden);
    return items.filter((n) => !hiddenSet.has(getId(n))).map((n) => ({ ...n, read: n.read || readSet.has(getId(n)) }));
  };

  const unCountNotifications = async () => {
    console.log('🔢 Calculating unread notification count...');

    // Check if we're in Expo Go (limited native module support)
    const isExpoGo = !Device.isDevice || Platform.OS === 'web';
    console.log('📱 Is Expo Go:', isExpoGo);

    // For Expo Go, skip native-notify API calls and use local state
    if (isExpoGo) {
      try {
        const [storedRead, storedHidden] = await Promise.all([
          AsyncStorage.getItem(READ_IDS_KEY),
          AsyncStorage.getItem(HIDDEN_IDS_KEY),
        ]);
        const read = storedRead ? JSON.parse(storedRead) : [];
        const hidden = storedHidden ? JSON.parse(storedHidden) : [];

        // Use local notifications from context as primary source
        const localUnreadCount = notifications.filter((n) => !n.read).length;
        console.log('📊 Local unread count:', localUnreadCount);
        setUnreadNotificationCount(localUnreadCount);

        // Also check stored unread count from usePushNotifications hook
        const storedUnreadCount = await AsyncStorage.getItem("unreadCount");
        if (storedUnreadCount) {
          const count = Number(storedUnreadCount);
          // Use the higher count to ensure we don't miss notifications
          setUnreadNotificationCount(Math.max(localUnreadCount, count));
        }
      } catch (error) {
        console.warn('Error getting unread count in Expo Go:', error);
        const localUnreadCount = notifications.filter((n) => !n.read).length;
        setUnreadNotificationCount(localUnreadCount);
      }
      return;
    }

    // Fast path: use dedicated unread count API (for real devices)
    try {
      const unreadResp = await getUnreadNotificationInboxCount(
        32172,
        "PNF5T5VibvtV6lj8i7pbil"
      );
      const count = unreadResp?.data ?? 0;
      console.log('📊 API unread count:', count);
      setUnreadNotificationCount(count);
      return;
    } catch {}

    // Fallback: derive from inbox + local overlays
    try {
      const [storedRead, storedHidden] = await Promise.all([
        AsyncStorage.getItem(READ_IDS_KEY),
        AsyncStorage.getItem(HIDDEN_IDS_KEY),
      ]);
      const read = storedRead ? JSON.parse(storedRead) : [];
      const hidden = storedHidden ? JSON.parse(storedHidden) : [];

      const response = await getNotificationInbox(
        32172,
        "PNF5T5VibvtV6lj8i7pbil",
        50,
        0
      );
      const raw = Array.isArray(response) ? response : response?.data ?? [];
      const scoped = filterForUser(raw);
      const processed = applyOverlays(scoped, read, hidden);
      const unreadCount = processed.filter((n: any) => !n.read).length;
      console.log('📊 Fallback unread count:', unreadCount);
      setUnreadNotificationCount(unreadCount);
    } catch (error) {
      // Final fallback: use local notification state from context
      const localUnreadCount = notifications.filter((n) => !n.read).length;
      console.log('📊 Final fallback unread count:', localUnreadCount);
      setUnreadNotificationCount(localUnreadCount);
    }
  };
  useEffect(() => {
    unCountNotifications();
  }, [READ_IDS_KEY, HIDDEN_IDS_KEY, userId, notifications]);
  const createUser = async () => {
    if (!user || !userId || userCreated) return;

    setIsCreatingUser(true);
    setError(null);

    try {
      console.log("🔄 Creating user directly in Sanity...");

      const userData = {
        clerkId: userId,
        email: user.emailAddresses[0]?.emailAddress || "",
      };

      const result = await createUserDirectInSanity(userData);

      if (result.success) {
        console.log("✅ User created directly in Sanity successfully");
        setUserCreated(true);
      } else {
        throw new Error(result.error || "Failed to create user");
      }
    } catch (error: any) {
      console.error("❌ Error creating user directly:", error);
      setError(error.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const showOnboardingAgain = async () => {
    await AsyncStorage.removeItem("hasSeenOnboarding");
    router.push("/onboarding");
  };
  useEffect(() => {
    if (!isLoaded || !user) return;
    setUserProfile({
      firstName: (user.unsafeMetadata?.firstName as string) || "",
      lastName: (user.unsafeMetadata?.lastName as string) || "",
      email: user.emailAddresses[0]?.emailAddress || "",
      imageUrl: (user.unsafeMetadata?.imageUrl as string) || user.imageUrl,
      country: (user.unsafeMetadata?.country as string) || "Sverige",
      city: (user.unsafeMetadata?.city as string) || "",
    });
    setImageUrl((user.unsafeMetadata?.imageUrl as string) || user.imageUrl);
    createUser();
  }, [isLoaded, user]);

  // Filtering services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === "Alla" || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <SignedIn>
        <View className="flex-1">
          {/* Header */}
          <View className={`px-6  pt-8 ${isDark ? "bg-dark" : "bg-light"}`}>
            <View className="flex-row items-center justify-between bottom-6">
              {/* Profile */}
              <Link href="/profile" className="flex-row items-center">
                <Image
                  source={{ uri: imageUrl || userProfile?.imageUrl }}
                  className="w-12 h-12 rounded-full border border-gray-400"
                />
                <View className="ml-2 ">
                  {/* Name */}
                  <AutoText
                    className={`font-semibold text-sm ml-3 mb-2 ${
                      isDark ? "text-dark-text" : "text-light-text"
                    }`}
                  >
                    {getGreeting(
                      !userProfile
                        ? ((user?.firstName + " " + user?.lastName) as string)
                        : userProfile?.firstName && userProfile?.lastName
                        ? `${userProfile.firstName} ${userProfile.lastName}`
                        : user?.firstName ?? "Användare"
                    )}
                  </AutoText>
                  {/* Location Row */}
                  <View className="flex-row items-center ml-3">
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={isDark ? "#9CA3AF" : "#6B7280"}
                      style={{ marginRight: 3 }}
                    />
                    <AutoText
                      className={`text-xs  ${
                        isDark ? "text-dark-text/60" : "text-light-text/60"
                      }`}
                    >
                      {(userProfile?.country || "") +
                        ", " +
                        (userProfile?.city || "")}
                    </AutoText>
                  </View>
                </View>
              </Link>
              {/* Notifications */}
              <TouchableOpacity
                onPress={async () => {
                  // Refresh unread count before navigating
                  await unCountNotifications();
                  router.push("/notification");
                }}
                className="w-10 h-10 rounded-full items-center justify-center mb-10 relative"
              >
                {unreadNotificationCount > 0 && (
                  <View className="absolute -top-1 -right-0 min-w-[18px] h-[18px] bg-primary rounded-full items-center justify-center">
                    <AutoText className="text-white text-[10px] font-bold">
                      {unreadNotificationCount > 99
                        ? "99+"
                        : unreadNotificationCount}
                    </AutoText>
                  </View>
                )}

                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={isDark ? "#fff" : "#64748b"}
                />
              </TouchableOpacity>
            </View>
            {/* Live Status  */}
            <LiveStatus />
            {/* Search + Filter Row */}
            <View
              className={`flex-row items-center rounded-full border px-2 h-14 mt-3 ${
                isDark
                  ? "bg-dark-card border-gray-700"
                  : "bg-light-card border-gray-300"
              }`}
            >
              {/* Search Icon */}
              <Ionicons
                name="search"
                size={16}
                color="#9CA3AF"
                style={{ marginLeft: 6, marginBottom: 3 }}
              />

              {/* Input Wrapper */}
              <View className="flex-1 relative">
                <Input
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="ml-3 text-sm mb-1 pr-16" // pr-16 adds padding so text doesn't overlap button
                  style={{ color: isDark ? "#fff" : "#000" }}
                  placeholder="Sök efter tjänster"
                  placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                />

                {/* Clear button fixed to the right */}
                {searchQuery.trim() !== "" && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    className="absolute right-1 top-3 -translate-y-1/2 px-4 py-2 rounded-full bg-primary"
                  >
                    <AutoText className="text-white font-semibold text-sm">
                      Rensa
                    </AutoText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Category Tabs */}
            <CategoryTabs
              categories={categories}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              isDark={isDark}
              index={categories.indexOf(activeCategory)}
            />
          </View>

          {/* Services */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            className={`px-6 flex-1 ${isDark ? "bg-dark" : "bg-light"}`}
          >
            <AutoText
              className={`text-xl font-bold my-4 ${
                isDark ? "text-dark-text" : "text-light-text"
              }`}
            >
              Våra Tjänster
            </AutoText>

            <View className="gap-4 pb-10">
              {filteredServices.length > 0 ? (
                filteredServices.map((service, idx) => (
                  <ServiceCard
                    key={service.id}
                    id={service.id}
                    title={service.title}
                    description={service.description}
                    icon={service.icon}
                    color={service.color}
                    isDark={isDark}
                    index={idx}
                    onPress={() => router.push(service.route as any)}
                  />
                ))
              ) : (
                <View className="items-center justify-center py-10">
                  <Ionicons
                    name="search-outline"
                    size={50}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                  <AutoText
                    className={`mt-3 text-base ${
                      isDark ? "text-dark-text/60" : "text-light-text/60"
                    }`}
                  >
                    Inga tjänster hittades
                  </AutoText>
                </View>
              )}
            </View>
            {/* Announcements */}
            <AnnouncementsCarousel />
            {/* Onboarding Button - Only show if user is new or wants to see it again */}
            <TouchableOpacity
              onPress={showOnboardingAgain}
              className="bg-indigo-100 dark:bg-indigo-900 p-4 rounded-xl mt-3 mb-4 items-center"
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="play-circle"
                  size={20}
                  color="#6366f1"
                  className="mr-2"
                />
                <AutoText className="text-indigo-600 dark:text-indigo-300 font-medium">
                  Se introduktion igen
                </AutoText>
              </View>
            </TouchableOpacity>
            {/* Footer */}
            <AppFooter />
          </ScrollView>
        </View>
        <StatusBar style={isDark ? "light" : "dark"} />
      </SignedIn>
      {/* Signed Out */}
      <RedirectIfSignedOut />
    </SafeAreaView>
  );
}
