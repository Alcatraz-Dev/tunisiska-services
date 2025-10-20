
import { registerIndieID, unregisterIndieDevice } from 'native-notify';

// Native Notify Configuration
const NATIVE_NOTIFY_CONFIG = {
  APP_ID: parseInt(process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_ID || '32172'),
  APP_TOKEN: process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_TOKEN || 'PNF5T5VibvtV6lj8i7pbil',
  BASE_URL: "https://app.nativenotify.com",
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  ICON_URL: "https://studio-tunisiska.com/favicon.png",
};

// Types
export interface NotificationPayload {
  title: string;
  message: string;
  subtitle?: string;
  pushData?: Record<string, any>;
  bigPictureURL?: string;
  subID?: string;
  image?: string; // Add image field for convenience
}

export interface BulkNotificationPayload extends NotificationPayload {
  subIDs: string[];
}

export interface ScheduledNotificationPayload extends NotificationPayload {
  sendDate: string; // Format: "MM-DD-YYYY"
  sendTime: string; // Format: "HH:MM AM/PM"
  timezone?: string; // Default: "America/New_York"
}

export interface NotificationResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

// Error handling with retry logic
async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  retries: number = NATIVE_NOTIFY_CONFIG.MAX_RETRIES
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (retries > 0) {
      console.log(`API call failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, NATIVE_NOTIFY_CONFIG.RETRY_DELAY));
      return retryApiCall(apiCall, retries - 1);
    }
    throw error;
  }
}

// Core Native Notify API Class
export class NativeNotifyAPI {
  private static instance: NativeNotifyAPI;
  private appId: number;
  private appToken: string;

  private constructor() {
    this.appId = NATIVE_NOTIFY_CONFIG.APP_ID;
    this.appToken = NATIVE_NOTIFY_CONFIG.APP_TOKEN;
  }

  public static getInstance(): NativeNotifyAPI {
    if (!NativeNotifyAPI.instance) {
      NativeNotifyAPI.instance = new NativeNotifyAPI();
    }
    return NativeNotifyAPI.instance;
  }

  // User Registration & Management
  async registerUser(userId: string, expoPushToken?: string): Promise<NotificationResponse> {
    try {
      await retryApiCall(async () => {
        // Register with Native Notify using Indie ID (Clerk user ID)
        await registerIndieID(userId, this.appId, this.appToken);
        
        // If we have an Expo push token, we could store it for direct sends
        if (expoPushToken) {
          console.log(`Registered user ${userId} with push token: ${expoPushToken.substring(0, 20)}...`);
        }
      });

      return {
        success: true,
        message: `User ${userId} registered successfully`,
      };
    } catch (error) {
      console.error('Failed to register user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  async unregisterUser(userId: string): Promise<NotificationResponse> {
    try {
      await retryApiCall(async () => {
        await unregisterIndieDevice(userId, this.appId, this.appToken);
      });

      return {
        success: true,
        message: `User ${userId} unregistered successfully`,
      };
    } catch (error) {
      console.error('Failed to unregister user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unregistration failed',
      };
    }
  }

  // Send Individual Notification with Expo fallback
  async sendNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    try {
      const response = await retryApiCall(async () => {
        const apiPayload = {
          appId: this.appId,
          appToken: this.appToken,
          title: payload.title,
          body: payload.message,
          dateSent: new Date().toISOString(),
          pushData: payload.pushData ? JSON.stringify(payload.pushData) : '{}',
          icon: NATIVE_NOTIFY_CONFIG.ICON_URL,
        };

        if (payload.subID) {
          // Send to specific user
          (apiPayload as any).subID = payload.subID;
        }

        if (payload.subtitle) {
          (apiPayload as any).subtitle = payload.subtitle;
        }

        if (payload.bigPictureURL) {
          (apiPayload as any).bigPictureURL = payload.bigPictureURL;
        }

        // Handle image field - prioritize direct image field, then bigPictureURL, then pushData
        let finalImageUrl = payload.image || payload.bigPictureURL || payload.pushData?.image;

        if (finalImageUrl) {
          // Set bigPictureURL for native Android/iOS rich notifications
          (apiPayload as any).bigPictureURL = finalImageUrl;
          console.log('Setting bigPictureURL:', finalImageUrl);

          // Also set image field for Expo Go compatibility
          (apiPayload as any).image = finalImageUrl;
          console.log('Setting image field for Expo Go compatibility:', finalImageUrl);

          // Store in pushData for retrieval in notification handlers
          if (!(apiPayload as any).pushData) {
            (apiPayload as any).pushData = '{}';
          }
          try {
            const pushData = JSON.parse((apiPayload as any).pushData);
            pushData.image = finalImageUrl;
            (apiPayload as any).pushData = JSON.stringify(pushData);
          } catch (e) {
            (apiPayload as any).pushData = JSON.stringify({ image: finalImageUrl });
          }
        }

        const url = payload.subID
          ? `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/indie/notification`
          : `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/notification`;

        console.log('Send notification URL:', url);
        console.log('Send notification payload:', JSON.stringify(apiPayload, null, 2));

        const fetchResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiPayload),
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('Server error response:', errorText);
          throw new Error(`HTTP error! status: ${fetchResponse.status} - ${errorText}`);
        }

        const responseText = await fetchResponse.text();
        console.log('Raw response:', responseText);

        // Try to parse as JSON, but handle non-JSON responses
        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          console.warn('Response is not valid JSON, treating as success:', responseText);
          return { success: true, message: responseText };
        }
      });

      // For admin notifications (broadcast), we need to handle differently
      // Admin notifications should go to all users, so we don't use subID
      if (!payload.subID) {
        console.log('📢 Admin broadcast notification - sending to all users');
        // For broadcast notifications, use Native Notify which handles bulk sending
        // The response.success check will determine if we return this result
      } else {
        // For individual notifications, prefer Expo SDK for Expo Go users
        if (payload.subID.startsWith('ExponentPushToken[')) {
          console.log('📱 Detected Expo push token, using Expo SDK for image support...');
          try {
            const expoResponse = await this.sendExpoNotification(payload);
            if (expoResponse.success) {
              console.log('✅ Expo SDK notification sent successfully with image support');
              return expoResponse;
            } else {
              console.log('⚠️ Expo SDK failed, falling back to Native Notify...');
            }
          } catch (expoError) {
            console.warn('⚠️ Expo SDK failed:', expoError);
          }
        }

        // If Expo SDK failed or we don't have an Expo token, try Native Notify
        if (!response.success) {
          console.log('🔄 Native Notify failed, trying Expo SDK fallback...');
          try {
            const expoResponse = await this.sendExpoNotification(payload);
            if (expoResponse.success) {
              console.log('✅ Expo SDK fallback successful');
              return expoResponse;
            }
          } catch (expoError) {
            console.warn('⚠️ Expo SDK fallback also failed:', expoError);
          }
        }
      }

      return {
        success: response.success,
        message: response.success ? 'Notification sent successfully' : 'Failed to send notification',
        data: response,
      };
    } catch (error) {
      console.error('Failed to send notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
      };
    }
  }

  // Send Bulk Notification
  async sendBulkNotification(payload: BulkNotificationPayload): Promise<NotificationResponse> {
    try {
      const response = await retryApiCall(async () => {
        const apiPayload = {
          appId: this.appId,
          appToken: this.appToken,
          title: payload.title,
          body: payload.message,
          subIDs: payload.subIDs,
          dateSent: new Date().toISOString(),
          pushData: JSON.stringify(payload.pushData || {}),
          icon: NATIVE_NOTIFY_CONFIG.ICON_URL,
        };

        if (payload.subtitle) {
          (apiPayload as any).subtitle = payload.subtitle;
        }

        if (payload.bigPictureURL) {
          (apiPayload as any).bigPictureURL = payload.bigPictureURL;
          (apiPayload as any).image = payload.bigPictureURL; // Also set image for Expo Go
        }

        // For Expo Go, ensure image is always set if available
        if (payload.image && !(apiPayload as any).image) {
          (apiPayload as any).image = payload.image;
        }

        const fetchResponse = await fetch(
          `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/indie/notification/bulk`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiPayload),
          }
        );

        if (!fetchResponse.ok) {
          throw new Error(`HTTP error! status: ${fetchResponse.status}`);
        }

        return await fetchResponse.json();
      });

      return {
        success: true,
        message: `Bulk notification sent to ${payload.subIDs.length} users`,
        data: response,
      };
    } catch (error) {
      console.error('Failed to send bulk notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send bulk notification',
      };
    }
  }

  // Schedule Notification
  async scheduleNotification(payload: ScheduledNotificationPayload): Promise<NotificationResponse> {
    try {
      console.log('Attempting to schedule notification with Native Notify API');
      console.log('Schedule details:', {
        sendDate: payload.sendDate,
        sendTime: payload.sendTime,
        timezone: payload.timezone || 'Europe/Stockholm'
      });

      const response = await retryApiCall(async () => {
        // Create dateSent in the format "MM-DD-YYYY HH:MMAM/PM"
        const now = new Date();
        const dateSent = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

        const apiPayload = {
          appId: this.appId,
          appToken: this.appToken,
          title: payload.title,
          body: payload.message,
          dateSent: dateSent,
          sendDate: payload.sendDate,
          sendTime: payload.sendTime,
          timezone: payload.timezone || 'Europe/Stockholm',
          pushData: payload.pushData ? JSON.stringify(payload.pushData) : '{}',
          icon: NATIVE_NOTIFY_CONFIG.ICON_URL,
        };

        if (payload.subID) {
          (apiPayload as any).subID = payload.subID;
        }

        if (payload.subtitle) {
          (apiPayload as any).subtitle = payload.subtitle;
        }

        if (payload.bigPictureURL) {
          (apiPayload as any).bigPictureURL = payload.bigPictureURL;
          (apiPayload as any).image = payload.bigPictureURL; // Also set image for Expo Go
        }

        if (payload.image) {
          (apiPayload as any).bigPictureURL = payload.image;
          (apiPayload as any).image = payload.image; // Also set image for Expo Go
        }

        const url = payload.subID
          ? `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/indie/notification`
          : `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/notification`;

        console.log('Scheduled notification URL:', url);
        console.log('Scheduled notification payload:', JSON.stringify(apiPayload, null, 2));

        const fetchResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiPayload),
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('Server error response:', errorText);
          throw new Error(`HTTP error! status: ${fetchResponse.status} - ${errorText}`);
        }

        const responseText = await fetchResponse.text();
        console.log('Raw scheduled response:', responseText);

        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          console.warn('Response is not valid JSON, treating as success:', responseText);
          return { success: true, message: responseText };
        }
      });

      return {
        success: true,
        message: 'Notification scheduled successfully',
        data: response,
      };
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      // Fallback: send as immediate notification
      console.log('Falling back to immediate notification due to scheduling failure');
      return await this.sendNotification({
        title: payload.title,
        message: payload.message,
        subID: payload.subID,
        subtitle: payload.subtitle,
        pushData: {
          ...payload.pushData,
          scheduledFor: `${payload.sendDate} ${payload.sendTime}`,
          timezone: payload.timezone,
          note: 'This was requested as a scheduled notification but sent immediately due to API limitations'
        },
        bigPictureURL: payload.bigPictureURL || payload.image,
        image: payload.image
      });
    }
  }

  // Get notification inbox for a user
  async getUserInbox(userId: string, limit: number = 20, offset: number = 0) {
    try {
      const response = await retryApiCall(async () => {
        // Using the existing getNotificationInbox from native-notify package
        const { getNotificationInbox } = require('native-notify');
        return await getNotificationInbox(this.appId, this.appToken, limit, offset);
      });

      // Filter for specific user if needed
      const userNotifications = Array.isArray(response) 
        ? response.filter((notification: any) => 
            notification.subID === userId || 
            notification.subscriberId === userId ||
            notification.indie_id === userId
          )
        : response?.data?.filter((notification: any) => 
            notification.subID === userId || 
            notification.subscriberId === userId ||
            notification.indie_id === userId
          ) || [];

      return {
        success: true,
        data: userNotifications,
      };
    } catch (error) {
      console.error('Failed to get user inbox:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get inbox',
        data: [],
      };
    }
  }

  // Mark notification as read
  async markAsRead(userId: string, notificationId: string): Promise<NotificationResponse> {
    try {
      await retryApiCall(async () => {
        const fetchResponse = await fetch(
          `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/indie/notification/read`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              appId: this.appId,
              appToken: this.appToken,
              subID: userId,
              notificationId: notificationId,
            }),
          }
        );

        if (!fetchResponse.ok) {
          throw new Error(`HTTP error! status: ${fetchResponse.status}`);
        }

        return await fetchResponse.json();
      });

      return {
        success: true,
        message: 'Notification marked as read',
      };
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark as read',
      };
    }
  }

  // Delete notification
  async deleteNotification(userId: string, notificationId: string): Promise<NotificationResponse> {
    try {
      await retryApiCall(async () => {
        const fetchResponse = await fetch(
          `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/indie/notification/delete`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              appId: this.appId,
              appToken: this.appToken,
              subID: userId,
              notificationId: notificationId,
            }),
          }
        );

        if (!fetchResponse.ok) {
          throw new Error(`HTTP error! status: ${fetchResponse.status}`);
        }

        return await fetchResponse.json();
      });

      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete notification',
      };
    }
  }

  // Send Expo notification directly (primary for Expo Go with images)
  async sendExpoNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    try {
      // Get the server URL from environment or config
      const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000';

      // For Expo notifications, we need the actual Expo push token, not the user ID
      let expoToken = payload.subID;

      // If the subID is a user ID, try to get the stored Expo token
      if (expoToken && !expoToken.startsWith('ExponentPushToken[')) {
        try {
          // Import AsyncStorage dynamically to avoid issues
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          const storedToken = await AsyncStorage.getItem(`expo_token_${expoToken}`);
          if (storedToken) {
            expoToken = storedToken;
            console.log('🔑 Using stored Expo token for user:', expoToken.substring(0, 20) + '...');
          } else {
            console.warn('⚠️ No stored Expo token found for user:', expoToken);
            return {
              success: false,
              error: 'No Expo push token available for user',
            };
          }
        } catch (storageError) {
          console.error('Failed to get stored Expo token:', storageError);
          return {
            success: false,
            error: 'Failed to retrieve Expo push token',
          };
        }
      }

      const response = await retryApiCall(async () => {
        const fetchResponse = await fetch(`${serverUrl}/api/send-expo-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            expoPushToken: expoToken,
            title: payload.title,
            message: payload.message,
            image: payload.image || payload.bigPictureURL,
            data: payload.pushData,
          }),
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          throw new Error(`HTTP error! status: ${fetchResponse.status} - ${errorText}`);
        }

        return await fetchResponse.json();
      });

      return {
        success: true,
        message: 'Expo notification sent successfully',
        data: response,
      };
    } catch (error) {
      console.error('Failed to send Expo notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send Expo notification',
      };
    }
  }

  // Get app statistics
  async getAppStats(): Promise<NotificationResponse> {
    try {
      const response = await retryApiCall(async () => {
        const fetchResponse = await fetch(
          `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/app/stats?appId=${this.appId}&appToken=${this.appToken}`
        );

        if (!fetchResponse.ok) {
          throw new Error(`HTTP error! status: ${fetchResponse.status}`);
        }

        return await fetchResponse.json();
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Failed to get app stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats',
      };
    }
  }
}

// Export singleton instance
export const nativeNotifyAPI = NativeNotifyAPI.getInstance();