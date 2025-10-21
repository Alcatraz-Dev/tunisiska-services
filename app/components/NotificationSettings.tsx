// NotificationSettings.tsx
import { Switch, View, Image } from "react-native";
import { useNotifications } from "@/app/context/NotificationContext";
import { AutoText } from "./ui/AutoText";
import icons from "../constants/icons";

export default function NotificationSettings({ isDark }: { isDark: boolean }) {
  const { notificationsEnabled, setNotificationsEnabled } = useNotifications();

  return (
    <View
      className={`flex-row items-center justify-between p-4 `}
    >
      <View className="flex-row items-center">
        <Image
          source={icons.bell}
          className="w-5 h-5 mr-3"
          style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
        />
        <AutoText className={isDark ? "text-white" : "text-gray-900"}>
          {notificationsEnabled ? "Avaktivera notiser" : "Aktivera notiser"}
        </AutoText>
      </View>
      <Switch
        value={notificationsEnabled}
        onValueChange={(value) => setNotificationsEnabled(value)}
      />
    </View>
  );
}