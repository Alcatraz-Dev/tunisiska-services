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
      width: (width - 48 - 16) / 2, // Accounting for screen padding (24*2) and gap (16)
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
      }}
    >
      <View className="flex-row justify-between items-center">
        <View className="bg-white/20 p-2 rounded-2xl">
          <Ionicons name={icon as any} size={20} color="white" />
        </View>
        <Ionicons name="trending-up" size={16} color="white/40" />
      </View>

      <View>
        <AutoText className="text-white text-2xl font-bold">{value}</AutoText>
        <AutoText className="text-white/70 text-[10px] font-semibold uppercase tracking-widest mt-1">
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
        <AutoText className="text-gray-500 text-[10px] font-black mt-1 uppercase tracking-tighter">
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
    announcements: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          users,
          shipping,
          taxi,
          announcements,
          totalRevenueShipping,
          totalRevenueTaxi,
          recent,
        ] = await Promise.all([
          client.fetch(`count(*[_type == "user"])`),
          client.fetch(`count(*[_type == "shippingOrder"])`),
          client.fetch(`count(*[_type == "taxiOrder"])`),
          client.fetch(`count(*[_type == "announcement"])`),
          client.fetch(`math::sum(*[_type == "shippingOrder"].totalPrice)`),
          client.fetch(`math::sum(*[_type == "taxiOrder"].totalPrice)`),
          client.fetch(`*[_type == "shippingOrder"] | order(_createdAt desc)[0...5] {
            _id,
            "customerName": customerInfo.name,
            totalPrice,
            status,
            _createdAt
          }`),
        ]);

        setStats({
          users,
          shippingOrders: shipping,
          taxiOrders: taxi,
          announcements,
          revenue: (totalRevenueShipping || 0) + (totalRevenueTaxi || 0),
        });
        setRecentOrders(recent || []);
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
      description: "Brukare & Rättigheter",
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
      description: "Container Frakt",
      icon: "boat",
      href: "/profile/admin-manage/container-shipping-orders",
      color: "#0ea5e9",
    },
    {
      title: "Sändningsschema",
      description: "Rutter & Planering",
      icon: "calendar",
      href: "/profile/admin-manage/shipping-schedules",
      color: "#ec4899",
    },
    {
      title: "Containerschema",
      description: "Båtrutter & Planering",
      icon: "time",
      href: "/profile/admin-manage/container-shipping-schedules",
      color: "#6366f1",
    },
    {
      title: "Taxi Ordrar",
      description: "Bokningar & Live",
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
      title: "Flytt Ordrar",
      description: "Flyttuppdrag",
      icon: "bus",
      href: "/profile/admin-manage/move-orders",
      color: "#10b981",
    },
    {
      title: "Flytt & Städ",
      description: "Kombinerade uppdrag",
      icon: "home",
      href: "/profile/admin-manage/move-clean-orders",
      color: "#06b6d4",
    },
    {
      title: "Vänförfrågningar",
      description: "Anslutningar",
      icon: "person-add",
      href: "/profile/admin-manage/friend-requests",
      color: "#6366f1",
    },
    {
      title: "Live Status",
      description: "Appens Driftsstatus",
      icon: "pulse",
      href: "/profile/admin-manage/live-status",
      color: "#84cc16",
    },
    {
      title: "Footer",
      description: "Footer Information",
      icon: "list",
      href: "/profile/admin-manage/footer",
      color: "#64748b",
    },
    {
      title: "Användarvillkor",
      description: "Legal Text",
      icon: "document-text",
      href: "/profile/admin-manage/terms",
      color: "#475569",
    },
    {
      title: "Integritetspolicy",
      description: "GDPR & Data",
      icon: "shield-checkmark",
      href: "/profile/admin-manage/privacy",
      color: "#334155",
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
          className={`p-2 rounded-2xl ${isDark ? "bg-white/5" : "bg-gray-100"}`}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={isDark ? "#fff" : "#000"}
          />
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
              className="rounded-[40px] p-8 mb-8 mt-6 overflow-hidden relative shadow-2xl"
              style={{
                shadowColor: isDark ? "#000" : "#3b82f6",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
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

            {/* Stats Grid */}
            <View className="flex-row flex-wrap justify-between">
              <StatCard
                title="Brukare"
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
                title="Taxi"
                value={stats.taxiOrders.toString()}
                icon="car"
                colors={["#f7971e", "#ffd200"]}
                isDark={isDark}
              />
              <StatCard
                title="Annonser"
                value={stats.announcements.toString()}
                icon="megaphone"
                colors={["#ed4264", "#ffedbc"]}
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
                    className={`text-xs font-black text-center ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {action.title}
                  </AutoText>
                  <AutoText
                    className="text-[9px] text-gray-500 mt-1 text-center font-bold"
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
