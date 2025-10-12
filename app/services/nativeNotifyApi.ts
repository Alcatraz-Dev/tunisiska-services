
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

  // Send Individual Notification
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

        const url = payload.subID
          ? `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/indie/notification`
          : `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/notification`;

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

      return {
        success: true,
        message: 'Notification sent successfully',
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
      const response = await retryApiCall(async () => {
        const apiPayload = {
          appId: this.appId,
          appToken: this.appToken,
          title: payload.title,
          body: payload.message,
          subID: payload.subID,
          sendDate: payload.sendDate,
          sendTime: payload.sendTime,
          timezone: payload.timezone || "America/New_York",
          pushData: JSON.stringify(payload.pushData || {}),
          icon: NATIVE_NOTIFY_CONFIG.ICON_URL,
        };

        if (payload.subtitle) {
          (apiPayload as any).subtitle = payload.subtitle;
        }

        const fetchResponse = await fetch(
          `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/indie/notification/scheduled`,
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
        message: 'Scheduled notification created successfully',
        data: response,
      };
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule notification',
      };
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