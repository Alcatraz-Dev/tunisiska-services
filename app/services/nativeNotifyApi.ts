import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const getNativeNotify = () => {
  if (Platform.OS === 'android' && isExpoGo) return null;
  try {
    return require("native-notify");
  } catch (error) {
    console.log("📱 native-notify not available");
    return null;
  }
};

const NATIVE_NOTIFY_CONFIG = {
  APP_ID: parseInt(process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_ID || "32172"),
  APP_TOKEN:
    process.env.EXPO_PUBLIC_NATIVE_NOTIFY_APP_TOKEN || "PNF5T5VibvtV6lj8i7pbil",
  BASE_URL: "https://app.nativenotify.com",
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  ICON_URL: "https://studio-tunisiska.com/favicon.png",
};

export interface NotificationPayload {
  title: string;
  message: string;
  subtitle?: string;
  pushData?: Record<string, any>;
  bigPictureURL?: string;
  subID?: string;
  image?: string;
  mediaURL?: string;
}

export interface BulkNotificationPayload extends NotificationPayload {
  subIDs: string[];
}

export interface ScheduledNotificationPayload extends NotificationPayload {
  sendDate: string;
  sendTime: string;
  timezone?: string;
}

export interface NotificationResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  retries: number = NATIVE_NOTIFY_CONFIG.MAX_RETRIES
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (retries > 0) {
      console.log(`API call failed, retrying (${retries} left)...`);
      await new Promise((res) =>
        setTimeout(res, NATIVE_NOTIFY_CONFIG.RETRY_DELAY)
      );
      return retryApiCall(apiCall, retries - 1);
    }
    throw error;
  }
}

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

  // --- User Registration ---
  async registerUser(
    userId: string,
    expoPushToken?: string
  ): Promise<NotificationResponse> {
    const nn = getNativeNotify();
    if (!nn?.registerIndieID) {
      console.log("📱 Skipping native notify registration (module missing)");
      return { success: false, message: "Native Notify module missing" };
    }
    try {
      await retryApiCall(async () =>
        nn.registerIndieID(userId, this.appId, this.appToken)
      );
      return {
        success: true,
        message: `User ${userId} registered successfully`,
      };
    } catch (error) {
      console.error("Failed to register user:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      };
    }
  }

  async unregisterUser(userId: string): Promise<NotificationResponse> {
    const nn = getNativeNotify();
    if (!nn?.unregisterIndieDevice) {
      console.log("📱 Skipping native notify unregistration (module missing)");
      return { success: false, message: "Native Notify module missing" };
    }
    try {
      await retryApiCall(async () =>
        nn.unregisterIndieDevice(userId, this.appId, this.appToken)
      );
      return {
        success: true,
        message: `User ${userId} unregistered successfully`,
      };
    } catch (error) {
      console.error("Failed to unregister user:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unregistration failed",
      };
    }
  }

  // --- Send Notification ---
  async sendNotification(
    payload: NotificationPayload
  ): Promise<NotificationResponse> {
    try {
      // Use Native Notify as primary delivery method (OneSignal requires development build)
      return await this.sendNativeNotify(payload);
    } catch (error) {
      console.error("Failed to send notification:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send notification",
      };
    }
  }

  private async sendNativeNotify(
    payload: NotificationPayload
  ): Promise<NotificationResponse> {
    const url = payload.subID
      ? `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/indie/notification`
      : `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/notification`;

    const apiPayload: any = {
      appId: this.appId,
      appToken: this.appToken,
      title: payload.title,
      body: payload.message,
      dateSent: new Date().toISOString(),
      pushData: JSON.stringify(payload.pushData || {}),
      icon: NATIVE_NOTIFY_CONFIG.ICON_URL,
    };

    if (payload.subID) apiPayload.subID = payload.subID;
    if (payload.subtitle) apiPayload.subtitle = payload.subtitle;
    if (payload.bigPictureURL) apiPayload.bigPictureURL = payload.bigPictureURL;
    if (payload.image) apiPayload.bigPictureURL = payload.image;
    if (payload.mediaURL) apiPayload.bigPictureURL = payload.mediaURL;

    const response = await retryApiCall(async () => {
      const fetchResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });
      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        throw new Error(`HTTP ${fetchResponse.status}: ${errorText}`);
      }
      const responseText = await fetchResponse.text();
      // Handle non-JSON responses
      const isTrialExpired = responseText.toLowerCase().includes("pay") || 
                            responseText.toLowerCase().includes("trial") ||
                            responseText.toLowerCase().includes("login");
      
      try {
        const parsed = JSON.parse(responseText);
        if (isTrialExpired && !parsed.notification_id && !parsed.id) {
           return { success: false, error: responseText };
        }
        return parsed;
      } catch (parseError) {
        if (isTrialExpired) {
          return { success: false, error: responseText };
        }
        console.warn('Response is not valid JSON, treating as success:', responseText);
        return { success: true, message: responseText };
      }
    });

    if (response && response.success === false) {
       return {
         success: false,
         error: response.error || "Request failed",
         data: response
       };
    }

    return {
      success: true,
      message: "Notification sent via Native Notify",
      data: response,
    };
  }

  // --- Fetch sent notification history from NativeNotify ---
  async getNotificationHistory(): Promise<any[]> {
    try {
      // NativeNotify notification inbox endpoint - returns all sent notifications
      const url = `${NATIVE_NOTIFY_CONFIG.BASE_URL}/api/notification/inbox/${this.appId}/${this.appToken}?take=200&skip=0`;
      const fetchResponse = await fetch(url);
      if (!fetchResponse.ok) {
        console.warn('Could not fetch notification history:', fetchResponse.status);
        return [];
      }
      const text = await fetchResponse.text();
      try {
        const data = JSON.parse(text);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  }

}

export const nativeNotifyAPI = NativeNotifyAPI.getInstance();

