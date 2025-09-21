
import { client } from '@/sanityClient';
import * as Notifications from 'expo-notifications';

export const setupPushNotifications = async (clerkId: string) => {
  // Listen for push token changes
  Notifications.addPushTokenListener(async (token) => {
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