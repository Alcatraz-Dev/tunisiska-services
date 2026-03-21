import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { client } from "@/sanityClient";
import { AutoText } from "../ui/AutoText";
import { useTheme } from "@/app/context/ThemeContext";

interface Column {
  key: string;
  label: string;
  type?: "text" | "date" | "status" | "currency" | "image";
}

interface AdminDataListProps {
  title: string;
  query: string;
  params?: Record<string, any>;
  columns: Column[];
  onItemPress?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  searchField?: string;
}

export const AdminDataList = ({
  title,
  query,
  params = {},
  columns,
  onItemPress,
  onEdit,
  onDelete,
  searchField,
}: AdminDataListProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await client.fetch(query, params);
      setData(result || []);
    } catch (error) {
      console.error(`Error fetching admin data for ${title}:`, error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [query]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredData =
    searchTerm && searchField
      ? data.filter((item) => {
          const value = item[searchField];
          return (
            value &&
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
          );
        })
      : data;

  const renderValue = (item: any, column: Column) => {
    const value = item[column.key];

    if (value === null || value === undefined) return "N/A";

    if (column.type === "date") {
      try {
        const date = new Date(value);
        return isNaN(date.getTime())
          ? "Ogiltigt datum"
          : date.toLocaleDateString();
      } catch {
        return "Ogiltigt datum";
      }
    }

    if (column.type === "currency") {
      return `${value || 0} SEK`;
    }

    if (column.type === "status") {
      const getStatusColor = (s: any) => {
        const val = String(s || "").toLowerCase();
        switch (val) {
          case "true":
          case "confirmed":
          case "completed":
          case "active":
          case "accepted":
            return "bg-green-500/20 text-green-500";
          case "pending":
            return "bg-yellow-500/20 text-yellow-500";
          case "false":
          case "cancelled":
          case "rejected":
            return "bg-red-500/20 text-red-500";
          default:
            return isDark
              ? "bg-blue-500/10 text-blue-400"
              : "bg-blue-500/10 text-blue-600";
        }
      };

      const statusStyle = getStatusColor(value);
      const [bgClass, textClass] = statusStyle.split(" ");

      return (
        <View className={`${bgClass} px-2 py-0.5 rounded-full`}>
          <AutoText className={`${textClass} text-[10px] font-black uppercase`}>
            {String(value)}
          </AutoText>
        </View>
      );
    }

    if (column.type === "image" && value?.asset?._ref) {
      return (
        <View
          className={`w-8 h-8 rounded-lg ${isDark ? "bg-white/5" : "bg-gray-200"}`}
        />
      );
    }

    if (Array.isArray(value)) {
      return `${value.length} objekt`;
    }

    if (typeof value === "object") {
      // Try common sub-fields for Sanity objects/references
      return (
        value.email ||
        value.userName ||
        value.name ||
        value.title ||
        value.label ||
        value.copyrightText ||
        "[Objekt]"
      );
    }

    return String(value);
  };

  const getItemTitle = (item: any) => {
    const primaryKey = columns[0].key;
    const value = item[primaryKey];
    
    if (value && typeof value === 'string') return value;
    if (value && typeof value === 'boolean') return String(value);
    
    // Fallback search in item
    return item.email || item.userName || item.name || item.title || item.clerkId || "Utan titel";
  };

  return (
    <View className="flex-1">
      {/* Search Bar */}
      {searchField && (
        <View
          className={`mx-6 mb-6 flex-row items-center px-5 h-14 rounded-[24px] ${isDark ? "bg-dark-card border border-white/5 shadow-sm" : "bg-white border border-gray-100 shadow-sm"}`}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={isDark ? "#3b82f6" : "#2563eb"}
          />
          <TextInput
            placeholder={`Sök efter ${title.toLowerCase()}...`}
            placeholderTextColor={isDark ? "#4b5563" : "#94a3b8"}
            value={searchTerm}
            onChangeText={setSearchTerm}
            className={`flex-1 ml-3 text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          />
        </View>
      )}

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 150 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
          renderItem={({ item, index }) => (
            <View key={item._id || index} className="relative">
              <TouchableOpacity
                onPress={() => (onItemPress ? onItemPress(item) : null)}
                className={`mb-3 p-5 rounded-[32px] shadow-sm ${isDark ? "bg-dark-card border border-white/5" : "bg-white border border-gray-100"}`}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <AutoText
                    className={`text-base font-black flex-1 mr-4 ${isDark ? "text-white" : "text-gray-900"}`}
                    numberOfLines={1}
                  >
                    {getItemTitle(item)}
                  </AutoText>

                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => (onDelete ? onDelete(item) : null)}
                      className={`w-8 h-8 rounded-full items-center justify-center mr-2 ${isDark ? "bg-red-500/10" : "bg-red-50"}`}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>

                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? "bg-white/5" : "bg-gray-50"}`}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={isDark ? "#3b82f6" : "#2563eb"}
                      />
                    </View>
                  </View>
                </View>

                <View className="flex-row flex-wrap">
                  {columns.slice(1).map((col) => {
                    const val = renderValue(item, col);
                    const isJSX = typeof val !== "string";

                    return (
                      <View key={col.key} className="flex-row items-center mr-4 mt-1">
                        {col.type !== "status" && col.type !== "image" && (
                          <AutoText className={`${isDark ? "text-gray-400" : "text-gray-500"} text-[9px] uppercase font-black mr-1 tracking-tighter`}>
                            {col.label}:
                          </AutoText>
                        )}
                        {isJSX ? (
                          val
                        ) : (
                          <AutoText className={`text-[10px] font-bold ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {val}
                          </AutoText>
                        )}
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Ionicons
                name="folder-open-outline"
                size={48}
                color={isDark ? "#1e293b" : "#cbd5e1"}
              />
              <AutoText className="text-gray-500 mt-4 text-center">
                Inga data hittades
              </AutoText>
            </View>
          }
        />
      )}
    </View>
  );
};
