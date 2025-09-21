import { PlayIcon } from '@sanity/icons';
import { Expo } from 'expo-server-sdk';


const expo = new Expo();

// Core send logic
export async function sendNotification(documentId: string, sanityClient: any) {
  const notification = await sanityClient.fetch(
    `*[_id == $id][0]`,
    { id: documentId }
  );

  if (!notification) throw new Error("Notification not found");
  const { title, message } = notification;

  // Fetch users with tokens
  const users = await sanityClient.fetch(`
    *[_type == "users" && defined(pushToken)]{
      pushToken
    }
  `);

  const pushTokens = users
    .map((u: any) => u.pushToken)
    .filter((t: any) => t && Expo.isExpoPushToken(t));

  if (!pushTokens.length) throw new Error('No valid Expo push tokens found');

  // Create messages
  const messages = pushTokens.map((pushToken: string) => ({
    to: pushToken,
    sound: 'default',
    title,
    body: message,
    data: { type: 'broadcast' },
  }));

  // Send in chunks
  const chunks = expo.chunkPushNotifications(messages);
  let sentCount = 0;

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log("Receipts:", receipts);
      sentCount += chunk.length;
    } catch (err) {
      console.error("Error sending chunk:", err);
    }
  }

  // Mark notification as sent
  await sanityClient.patch(documentId)
    .set({ sent: true, sentAt: new Date().toISOString(), sentCount })
    .commit();

  return sentCount;
}

// Sanity Studio document action
export const sendNotificationAction = {
  name: 'sendNotification',
  title: 'Send Push Notification',
  icon: PlayIcon,
  onHandle: async (context: any) => {
    try {
      const { documentId } = context;
      const sentCount = await sendNotification(documentId, context.client);
      context.resolveIntent({ type: 'success', message: `Sent to ${sentCount} devices!` });
    } catch (err: any) {
      console.error("Send error:", err);
      context.resolveIntent({ type: 'error', message: err.message });
    }
  },
};

// Attach action to notifications
export const notificationActions = (prev: any, context: any) => {
  if (context.schemaType === 'notification') {
    return [
      ...prev.filter((action: any) => action !== 'publish'),
      sendNotificationAction,
    ];
  }
  return prev;
};