import { AutoText } from "@/app/components/ui/AutoText";
import { useTheme } from "@/app/context/ThemeContext";
import { client } from "@/sanityClient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  colors: [string, string];
  isDark: boolean;
}

const StatCard = ({ title, value, icon, colors, isDark }: StatCardProps) => (
  <View
    className="mb-4"
    style={{
      width: (width - 48 - 16) / 2,
      // Accounting for screen padding (24*2) and gap (16)
    }}
  >
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="rounded-3xl p-4 h-32 justify-between"
      style={{
        elevation: 8,
        shadowColor: colors[0],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        borderRadius: 15,
        paddingHorizontal: 10,
        paddingVertical: 10,
      }}
    >
      <View className="flex-row justify-between items-center">
        <View className="bg-white/20 p-2 rounded-2xl">
          <Ionicons name={icon as any} size={20} color="white" />
        </View>
        <Ionicons name="trending-up" size={16} color="white/40" />
      </View>

      <View>
        <AutoText className="text-white text-2xl font-black">{value}</AutoText>
        <AutoText className="text-white/80 text-[11px] font-black uppercase tracking-widest mt-1">
          {title}
        </AutoText>
      </View>
    </LinearGradient>
  </View>
);

const RecentOrderCard = ({
  order,
  isDark,
  isLast,
}: {
  order: any;
  isDark: boolean;
  isLast: boolean;
}) => (
  <View
    className={`p-5 flex-row items-center justify-between ${!isLast ? (isDark ? "border-b border-white/5" : "border-b border-gray-100") : ""}`}
  >
    <View className="flex-row items-center flex-1">
      <View
        className={`w-12 h-12 rounded-[20px] items-center justify-center mr-4 ${isDark ? "bg-white/5 shadow-inner" : "bg-gray-50 shadow-sm border border-gray-100"}`}
      >
        <Ionicons
          name="receipt-outline"
          size={24}
          color={isDark ? "#3b82f6" : "#2563eb"}
        />
      </View>
      <View className="flex-1">
        <AutoText
          className={`text-base font-black ${isDark ? "text-white" : "text-gray-900"}`}
          numberOfLines={1}
        >
          {order.customerName || "Okänd Kund"}
        </AutoText>
        <AutoText
          className={`${isDark ? "text-gray-400" : "text-gray-500"} text-[10px] font-black mt-1 uppercase tracking-tighter`}
        >
          {order._createdAt
            ? new Date(order._createdAt).toLocaleDateString("sv-SE", {
                month: "short",
                day: "numeric",
              })
            : "NYSS"}
        </AutoText>
      </View>
    </View>

    <View className="items-end ml-4">
      <AutoText
        className={`text-base font-black ${isDark ? "text-white" : "text-gray-900"}`}
      >
        {order.totalPrice || 0} SEK
      </AutoText>
      <View
        className={`mt-2 px-3 py-1 rounded-full ${
          order.status === "completed"
            ? "bg-green-500/10"
            : order.status === "pending"
              ? "bg-yellow-500/10"
              : "bg-blue-500/10"
        }`}
      >
        <AutoText
          className={`text-[8px] font-black uppercase tracking-widest ${
            order.status === "completed"
              ? "text-green-500"
              : order.status === "pending"
                ? "text-yellow-600"
                : "text-blue-500"
          }`}
        >
          {order.status || "PENDING"}
        </AutoText>
      </View>
    </View>
  </View>
);

export default function AdminDashboard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    shippingOrders: 0,
    taxiOrders: 0,
    containers: 0,
    moves: 0,
    announcements: 0,
    friendRequests: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          users,
          shipping,
          taxi,
          containers,
          moves,
          announcements,
          totalRevenueShipping,
          totalRevenueTaxi,
          totalRevenueContainer,
          totalRevenueMove,
          recent,
          pending,
          pendingFriends,
        ] = await Promise.all([
          client.fetch(`count(*[_type == "users"])`),
          client.fetch(`count(*[_type == "shippingOrder"])`),
          client.fetch(`count(*[_type == "taxiOrder"])`),
          client.fetch(`count(*[_type == "containerShippingOrder"])`),
          client.fetch(
            `count(*[_type == "moveOrder" || _type == "moveCleaningOrder"])`,
          ),
          client.fetch(`count(*[_type == "announcement"])`),
          client.fetch(`math::sum(*[_type == "shippingOrder"].totalPrice)`),
          client.fetch(`math::sum(*[_type == "taxiOrder"].totalPrice)`),
          client.fetch(
            `math::sum(*[_type == "containerShippingOrder"].totalPrice)`,
          ),
          client.fetch(`math::sum(*[_type == "moveOrder"].totalPrice)`),
          client.fetch(`*[_type == "shippingOrder"] | order(_createdAt desc)[0...5] {
            _id,
            "customerName": customerInfo.name,
            totalPrice,
            status,
            _createdAt
          }`),
          client.fetch(
            `count(*[_type in ["shippingOrder", "taxiOrder", "containerShippingOrder", "moveOrder"] && status == "PENDING"])`,
          ),
          client.fetch(`count(*[_type == "friendRequest" && status == "pending"])`),
        ]);

        setStats({
          users: users || 0,
          shippingOrders: shipping || 0,
          taxiOrders: taxi || 0,
          containers: containers || 0,
          moves: moves || 0,
          announcements: announcements || 0,
          friendRequests: pendingFriends || 0,
          revenue:
            (totalRevenueShipping || 0) +
            (totalRevenueTaxi || 0) +
            (totalRevenueContainer || 0) +
            (totalRevenueMove || 0),
        });
        setRecentOrders(recent || []);
        setPendingCount(pending || 0);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const adminActions = [
    {
      title: "Användare",
      description: "Hantering & Roller",
      icon: "people",
      href: "/profile/admin-manage/users",
      color: "#3b82f6",
    },
    {
      title: "Sändningar",
      description: "Logistik & Frakt",
      icon: "cube",
      href: "/profile/admin-manage/shipping-orders",
      color: "#8b5cf6",
    },
    {
      title: "Containers",
      description: "Frakt & Logistik",
      icon: "boat",
      href: "/profile/admin-manage/container-shipping-orders",
      color: "#0ea5e9",
    },
    {
      title: "Sändningsschema",
      description: "Schema & Planering",
      icon: "calendar",
      href: "/profile/admin-manage/shipping-schedules",
      color: "#ec4899",
    },
    {
      title: "Containerschema",
      description: "Schema & Rutter",
      icon: "time",
      href: "/profile/admin-manage/container-shipping-schedules",
      color: "#6366f1",
    },
    {
      title: "Taxibokningar",
      description: "Resor & Drift",
      icon: "car",
      href: "/profile/admin-manage/taxi-orders",
      color: "#f59e0b",
    },
    {
      title: "Annonser",
      description: "Push & Kampanjer",
      icon: "megaphone",
      href: "/profile/admin-manage/announcements",
      color: "#f43f5e",
    },
    {
      title: "Flyttordrar",
      description: "Flyttuppdrag",
      icon: "bus",
      href: "/profile/admin-manage/move-orders",
      color: "#10b981",
    },
    {
      title: "Flytt & Städ",
      description: "Kombinerade jobb",
      icon: "home",
      href: "/profile/admin-manage/move-clean-orders",
      color: "#06b6d4",
    },
    {
      title: "Vänförfrågningar",
      description: "Poäng & Nätverk",
      icon: "person-add",
      href: "/profile/admin-manage/friend-requests",
      color: "#6366f1",
    },
    {
      title: "Livestatus",
      description: "Systemets hälsa",
      icon: "pulse",
      href: "/profile/admin-manage/live-status",
      color: "#84cc16",
    },
    {
      title: "Footer",
      description: "Design & Copy",
      icon: "reorder-four",
      href: "/profile/admin-manage/footer",
      color: "#64748b",
    },
    {
      title: "Användarvillkor",
      description: "Regler & Krav",
      icon: "document-text",
      href: "/profile/admin-manage/terms",
      color: "#94a3b8",
    },
    {
      title: "Policy",
      description: "GDPR & Data",
      icon: "shield-checkmark",
      href: "/profile/admin-manage/privacy",
      color: "#475569",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-500";
      case "pending":
        return "text-yellow-500";
      case "cancelled":
        return "text-red-500";
      default:
        return "text-blue-500";
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-white"}`}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className="px-6 pt-6 pb-2 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          className={`p-2 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={isDark ? "#fff" : "#000"}
          />
        </TouchableOpacity>
        <AutoText
          className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
        >
          Admin Kontrollpanel
        </AutoText>
        <TouchableOpacity
          onPress={() => router.push("/(home)/profile/admin-notifications")}
          className={`p-2 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={isDark ? "#fff" : "#000"}
          />
          {pendingCount > 0 && (
            <View
              className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border-2"
              style={{ borderColor: isDark ? "#000" : "#fff" }}
            >
              <AutoText className="text-white text-[10px] font-bold">
                {pendingCount > 9 ? "9+" : pendingCount}
              </AutoText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      >
        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#3b82f6" />
          </View>
        ) : (
          <>
            {/* Main Revenue Card */}
            <LinearGradient
              colors={isDark ? ["#1e293b", "#0f172a"] : ["#3b82f6", "#2563eb"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-3xl  p-8 mb-8 mt-6 overflow-hidden relative shadow-2xl"
              style={{
                shadowColor: isDark ? "#000" : "#3b82f6",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                borderRadius: 15,
                padding: 15,
                margin: 15,
              }}
            >
              <View className="absolute -right-10 -top-10 opacity-10">
                <Ionicons name="stats-chart" size={240} color="white" />
              </View>
              <AutoText className="text-white/60 text-[10px] font-black uppercase tracking-[3px]">
                Total Intäkt (30d)
              </AutoText>
              <View className="flex-row items-baseline mt-2">
                <AutoText className="text-white text-5xl font-black">
                  {(stats.revenue || 0).toLocaleString()}
                </AutoText>
                <AutoText className="text-white/80 text-xl font-bold ml-2">
                  SEK
                </AutoText>
              </View>

              <View className="flex-row items-center mt-6 bg-white/10 self-start px-3 py-1.5 rounded-2xl border border-white/20">
                <Ionicons name="trending-up" size={14} color="#4ade80" />
                <AutoText className="text-green-400 text-xs font-black ml-1">
                  +12.5%
                </AutoText>
                <View className="w-1 h-1 bg-white/40 rounded-full mx-2" />
                <AutoText className="text-white/60 text-[10px] font-bold">
                  ÖKNING
                </AutoText>
              </View>
            </LinearGradient>

            {/* Live Status Overview */}
            <TouchableOpacity 
              onPress={() => router.push("/profile/admin-manage/live-status")}
              className={`mb-8 p-6 mx-4 rounded-[20px] shadow-sm flex-row items-center border ${isDark ? "bg-dark-card border-white/5" : "bg-white border-gray-100"}`}
            >
              <View className="w-12 h-12 rounded-2xl bg-green-500/10 items-center justify-center mr-4">
                <Ionicons name="pulse" size={24} color="#22c55e" />
              </View>
              <View className="flex-1">
                <AutoText className={`text-sm font-bold uppercase tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}>Aktiv Status</AutoText>
                <AutoText className={`text-base font-black mt-1 ${isDark ? "text-white" : "text-gray-900"}`} numberOfLines={1}>
                  Systemet är aktivt och snurrar
                </AutoText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDark ? "#555" : "#ccc"} />
            </TouchableOpacity>

            {/* Stats Grid */}
            <View className="flex-row flex-wrap justify-between">
              <StatCard
                title="Användare"
                value={stats.users.toString()}
                icon="people"
                colors={["#00d2ff", "#3a7bd5"]}
                isDark={isDark}
              />
              <StatCard
                title="Sändningar"
                value={stats.shippingOrders.toString()}
                icon="cube"
                colors={["#8E2DE2", "#4A00E0"]}
                isDark={isDark}
              />
              <StatCard
                title="Containrar"
                value={stats.containers.toString()}
                icon="boat"
                colors={["#0ea5e9", "#2563eb"]}
                isDark={isDark}
              />
              <StatCard
                title="Taxi"
                value={stats.taxiOrders.toString()}
                icon="car"
                colors={["#f7971e", "#ffd200"]}
                isDark={isDark}
              />
              <StatCard
                title="Flytt"
                value={stats.moves.toString()}
                icon="bus"
                colors={["#10b981", "#059669"]}
                isDark={isDark}
              />
              <StatCard
                title="Vänner"
                value={stats.friendRequests.toString()}
                icon="person-add"
                colors={["#6366f1", "#a855f7"]}
                isDark={isDark}
              />
            </View>

            {/* Recent Orders Section */}
            <View className="flex-row justify-between items-center mt-6 mb-4">
              <AutoText
                className={`text-lg font-black ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Senaste Ordrar
              </AutoText>
              <TouchableOpacity
                onPress={() =>
                  router.push("/profile/admin-manage/shipping-orders")
                }
              >
                <AutoText className="text-primary font-bold">
                  Visa alla
                </AutoText>
              </TouchableOpacity>
            </View>

            <View
              className={`rounded-[32px] p-2 mb-6 ${isDark ? "bg-dark-card border border-white/5" : "bg-gray-50 border border-gray-100"}`}
            >
              {recentOrders.length > 0 ? (
                recentOrders.map((order, index) => (
                  <RecentOrderCard
                    key={order._id}
                    order={order}
                    isDark={isDark}
                    isLast={index === recentOrders.length - 1}
                  />
                ))
              ) : (
                <View className="py-10 items-center">
                  <AutoText className="text-gray-500">
                    Inga ordrar hittades
                  </AutoText>
                </View>
              )}
            </View>

            {/* Quick Actions Grid */}
            <AutoText
              className={`text-lg font-black mt-4 mb-6 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Snabbhantering
            </AutoText>

            <View className="flex-row flex-wrap justify-between">
              {adminActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => router.push(action.href as any)}
                  className={`mb-4 p-5 rounded-[32px] items-center justify-center ${isDark ? "bg-dark-card border border-white/5 shadow-sm" : "bg-white border border-gray-100 shadow-sm"}`}
                  style={{ width: (width - 48 - 12) / 2 }}
                >
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center mb-3"
                    style={{ backgroundColor: `${action.color}15` }}
                  >
                    <Ionicons
                      name={action.icon as any}
                      size={24}
                      color={action.color}
                    />
                  </View>
                  <AutoText
                    className={`text-[13px] font-black text-center px-1 ${isDark ? "text-white" : "text-gray-900"}`}
                    numberOfLines={1}
                  >
                    {action.title}
                  </AutoText>
                  <AutoText
                    className={`${isDark ? "text-gray-400" : "text-gray-500"} text-[9px] mt-0.5 text-center font-bold tracking-tighter`}
                    numberOfLines={1}
                  >
                    {action.description.toUpperCase()}
                  </AutoText>
                </TouchableOpacity>
              ))}
            </View>
            <View className="h-10" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
