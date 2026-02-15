
import { client } from '@/sanityClient';


let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch (error) {
  console.log("📱 expo-notifications not available (Expo Go limitation)");
}

export const setupPushNotifications = async (clerkId: string) => {
  if (!Notifications) return;

  // Listen for push token changes
  Notifications.addPushTokenListener(async (token: any) => {
    try {
      // Update user's push token in Sanity
      const user = await client.fetch(
        `*[_type == "users" && clerkId == $clerkId][0]`,
        { clerkId }
      );
      
      if (user && user.pushToken !== token.data) {
        await client
          .patch(user._id)
          .set({ pushToken: token.data })
          .commit();
      }
    } catch (error) {
      console.error('Error updating push token:', error);
    }
  });
};