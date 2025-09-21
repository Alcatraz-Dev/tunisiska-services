import { View, Text } from "react-native";
import { AutoText } from "../components/ui/AutoText";

export default function ServicesScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <AutoText className="text-lg font-bold text-gray-900 dark:text-white">
        Här visas tjänster 🛠️
      </AutoText>
    </View>
  );
}