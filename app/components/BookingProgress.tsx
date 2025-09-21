import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Timeline from "react-native-timeline-flatlist";

const statusSteps = [
  {
    time: "Bokad",
    title: "Bokad",
    description: "Din bokning är bekräftad",
    icon: "calendar-outline",
    circleColor: "#10B981",
  },
  {
    time: "Pågår",
    title: "Pågår",
    description: "Tjänsten pågår just nu",
    icon: "time-outline",
    circleColor: "#3B82F6",
  },
  {
    time: "Avslutad",
    title: "Avslutad",
    description: "Tjänsten är avslutad",
    icon: "checkmark-circle-outline",
    circleColor: "#8B5CF6",
  },
  {
    time: "Avbokad",
    title: "Avbokad",
    description: "Bokningen är avbokad",
    icon: "close-circle-outline",
    circleColor: "#EF4444",
  },
];

export default function BookingProgress({
  currentStatus,
  isDark
}: {
  currentStatus: string;
  isDark: boolean
}) {

  const activeIndex = statusSteps.findIndex((s) => s.time === currentStatus);

  const timelineData = statusSteps.map((step, index) => {
    const isCompleted = index <= activeIndex;
    const isCurrent = index === activeIndex;

    return {
      ...step,
      isCompleted,
      isCurrent,
      circleColor: isCompleted
        ? step.circleColor
        : isDark
        ? "#374151"
        : "#E5E7EB",
    };
  });





const renderDetail = (rowData: any) => {
  return (
    <View
      style={{
        marginLeft: 10,
        padding: 10,
        borderRadius: 12,
        backgroundColor: "transparent",
      }}
    >
      <Text className ={`text-lg font-bold `}  style={{ color: isDark ? "#D1D5DB" : "#6B7280" }}>
        {rowData.title}
      </Text>
      <Text style={{ color: isDark ? "#D1D5DB" : "#6B7280", marginTop: 4 }}>
        {rowData.description}
      </Text>
    </View>
  );
};
const containerBG =  isDark ? "#2c2c2e" : "#ffffff";
const titleStyle = { color: isDark ? "#D1D5DB" : "#6B7280" };
const descriptionStyle = { color: isDark ? "#D1D5DB" : "#6B7280" };
  const renderCircle = (rowData: any, sectionID: number, rowID: number) => {
    return (
      <View
        className={`w-10 h-10 rounded-full items-center justify-center  mt-5 mx-3 ${
          rowData.isCurrent ? "border-2 border-white" : ""
        }`}
        style={{
          backgroundColor: rowData.circleColor,
          shadowColor: rowData.isCompleted
            ? rowData.circleColor
            : "transparent",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 3,
          elevation: 3,
        }}
      >
        <Ionicons
          name={rowData.icon as any}
          size={20}
          color={
            rowData.isCompleted ? "#FFFFFF" : isDark ? "#9CA3AF" : "#6B7280"
          }
        />
      </View>
    );
  };

  return (
    <View className={`mt-2 mx-2`}>
      <Text
        className={`text-lg font-bold mb-6 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        Bokningsstatus
      </Text>

      <View style={{ marginTop: 8, marginHorizontal: 8, backgroundColor: containerBG, borderRadius: 12, paddingVertical: 10 }}>
    <Timeline
      data={timelineData}
      circleSize={20}
      circleColor={isDark ? "#374151" : "#E5E7EB"}
      lineColor={isDark ? "#4B5563" : "#D1D5DB"}
      lineWidth={2}
      timeStyle={{
        textAlign: "center",
        backgroundColor: isDark ? "#374151" : "#ffffff",
        color: isDark ? "#F3F4F6" : "#1F2937",
        padding: 5,
        borderRadius: 6,
        fontWeight: "bold",
      }}
     
      titleStyle={titleStyle}
      descriptionStyle={descriptionStyle}
      innerCircle={"icon"}
      renderDetail={renderDetail}
      renderCircle={renderCircle}
      isUsingFlatlist={false}
      showTime={false}
    />
  </View>
    </View>
  );
}
