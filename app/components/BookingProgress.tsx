import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AutoText } from "./ui/AutoText";

const statusSteps = [
  {
    key: "pending",
    title: "Bokad",
    description: "Din bokning är bekräftad",
    icon: "calendar-outline",
    color: "#10B981",
  },
  {
    key: "confirmed",
    title: "Bekräftad",
    description: "Bokningen är godkänd",
    icon: "checkmark-circle-outline",
    color: "#3B82F6",
  },
  {
    key: "in_progress",
    title: "Pågår",
    description: "Tjänsten pågår just nu",
    icon: "time-outline",
    color: "#F59E0B",
  },
  {
    key: "completed",
    title: "Avslutad",
    description: "Tjänsten är avslutad",
    icon: "checkmark-circle-outline",
    color: "#8B5CF6",
  },
  {
    key: "cancelled",
    title: "Avbokad",
    description: "Bokningen är avbokad",
    icon: "close-circle-outline",
    color: "#EF4444",
  },
];

export default function BookingProgress({
  currentStatus,
  isDark
}: {
  currentStatus: string;
  isDark: boolean
}) {
  const getStatusIndex = (status: string) => {
    const statusMap: { [key: string]: number } = {
      'Väntar': 0,
      'Bekräftad': 1,
      'Pågående': 2,
      'Avslutad': 3,
      'Avbokad': 4,
    };
    return statusMap[status] ?? 0;
  };

  const activeIndex = getStatusIndex(currentStatus);

  return (
    <View className="mt-6">
      {/* Clean Header */}
      <View className="mb-6">
        <AutoText className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
          Bokningsstatus
        </AutoText>
        <AutoText className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Spåra din bokningsresa
        </AutoText>
      </View>

      {/* Clean Progress Steps */}
      <View className="px-2">
        {statusSteps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isUpcoming = index > activeIndex;

          return (
            <View key={step.key} className="flex-row items-center mb-4">
              {/* Simple Step Circle */}
              <View className="relative items-center justify-center w-6 h-6">
                <View
                  className={`w-6 h-6 rounded-full ${
                    isCompleted
                      ? "bg-green-500"
                      : isCurrent
                      ? "bg-blue-500"
                      : isDark ? "bg-gray-600" : "bg-gray-300"
                  }`}
                />

                {/* Connection Line */}
                {index < statusSteps.length - 1 && (
                  <View
                    className={`absolute top-6 left-3 w-0.5 h-10 ${
                      isCompleted ? "bg-green-500" : isDark ? "bg-gray-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </View>

              {/* Step Content */}
              <View className="flex-1 ml-4">
                <View className="flex-row items-center justify-between">
                  <AutoText className={`font-semibold text-base ${
                    isCompleted
                      ? "text-green-600"
                      : isCurrent
                      ? isDark ? "text-white" : "text-gray-900"
                      : isDark ? "text-gray-500" : "text-gray-400"
                  }`}>
                    {step.title}
                  </AutoText>

                  {isCurrent && (
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                      <AutoText className="text-xs text-blue-600 font-medium">
                        Aktuell
                      </AutoText>
                    </View>
                  )}
                </View>

                <AutoText className={`text-sm mt-1 ${
                  isCompleted
                    ? isDark ? "text-green-300" : "text-green-700"
                    : isCurrent
                    ? isDark ? "text-gray-300" : "text-gray-700"
                    : isDark ? "text-gray-600" : "text-gray-400"
                }`}>
                  {step.description}
                </AutoText>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
