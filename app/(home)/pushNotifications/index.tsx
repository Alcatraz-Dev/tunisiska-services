import React, { useState, useEffect } from "react";
import { View, Button } from "react-native";

import { registerForPushNotificationsAsync } from "@/app/hooks/usePushNotifications";
// import { savePushToken } from "@/app/hooks/useQuery";

export default function TestPushScreen() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        console.log("Expo Push Token:", token);

        // Save token to Sanity
        // await savePushToken("USER_ID_HERE", token); // replace USER_ID_HERE
      }
    })();
  }, []);

  const sendPushNotificationToUser = async (userId: string) => {
    await fetch("/api/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        title: "Hello from Sanity",
        body: "This is a push sent via your backend",
        data: { screen: "home" },
      }),
    });
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Button
        title="Send Push Notification"
        onPress={() => sendPushNotificationToUser("USER_ID_HERE")}
      />
    </View>
  );
}