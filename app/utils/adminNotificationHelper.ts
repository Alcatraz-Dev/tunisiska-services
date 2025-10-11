import { nativeNotifyAPI } from '../services/nativeNotifyApi';
import { NotificationUtils } from './notificationUtils';

// Admin notification management types
export interface UserSegment {
  id: string;
  name: string;
  userIds: string[];
  criteria?: {
    registrationDate?: { from?: Date; to?: Date };
    lastActive?: { from?: Date; to?: Date };
    serviceUsage?: string[];
    location?: string;
    userType?: 'premium' | 'standard' | 'new';
  };
}

export interface Campaign {
  id: string;
  name: string;
  title: string;
  message: string;
  segments: string[];
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  category: 'marketing' | 'transactional' | 'system' | 'support';
  variables?: string[];
  imageUrl?: string;
}

// Admin Notification Helper Class
export class AdminNotificationHelper {
  private static instance: AdminNotificationHelper;
  
  private constructor() {}
  
  public static getInstance(): AdminNotificationHelper {
    if (!AdminNotificationHelper.instance) {
      AdminNotificationHelper.instance = new AdminNotificationHelper();
    }
    return AdminNotificationHelper.instance;
  }

  // Send announcement to all users
  async sendGlobalAnnouncement(
    title: string,
    message: string,
    userIds: string[],
    imageUrl?: string
  ): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
    try {
      const batchSize = 1000; // Native Notify bulk limit
      let sentCount = 0;
      let failedCount = 0;

      // Process in batches
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        const result = await nativeNotifyAPI.sendBulkNotification({
          title,
          message,
          subIDs: batch,
          bigPictureURL: imageUrl,
          pushData: { type: 'announcement', action: 'open_app' }
        });

        if (result.success) {
          sentCount += batch.length;
        } else {
          failedCount += batch.length;
          console.error(`Failed to send to batch: ${result.error}`);
        }
      }

      return {
        success: sentCount > 0,
        sentCount,
        failedCount
      };
    } catch (error) {
      console.error('Failed to send global announcement:', error);
      return {
        success: false,
        sentCount: 0,
        failedCount: userIds.length
      };
    }
  }

  // Send promotional campaign
  async sendPromotionalCampaign(
    title: string,
    message: string,
    userIds: string[],
    promoCode?: string,
    imageUrl?: string,
    scheduledFor?: Date
  ): Promise<{ success: boolean; campaignId?: string }> {
    try {
      if (scheduledFor && scheduledFor > new Date()) {
        // Schedule for later (implementation would depend on your backend)
        console.log(`Campaign scheduled for ${scheduledFor}`);
        return {
          success: true,
          campaignId: `campaign_${Date.now()}`
        };
      } else {
        // Send immediately
        const batchSize = 1000;
        let totalSent = 0;

        for (let i = 0; i < userIds.length; i += batchSize) {
          const batch = userIds.slice(i, i + batchSize);
          
          const result = await nativeNotifyAPI.sendBulkNotification({
            title,
            message,
            subIDs: batch,
            bigPictureURL: imageUrl,
            pushData: { 
              type: 'promotion', 
              action: 'view_offers',
              promoCode 
            }
          });

          if (result.success) {
            totalSent += batch.length;
          }
        }

        return {
          success: totalSent > 0,
          campaignId: `campaign_${Date.now()}`
        };
      }
    } catch (error) {
      console.error('Failed to send promotional campaign:', error);
      return { success: false };
    }
  }

  // Send maintenance notifications
  async sendMaintenanceNotification(
    userIds: string[],
    startTime: string,
    endTime: string,
    description?: string
  ): Promise<boolean> {
    try {
      const customMessage = description 
        ? `${description} Appen kommer att vara otillgänglig mellan ${startTime} och ${endTime}.`
        : `Systemunderhåll planerat mellan ${startTime} och ${endTime}. Vi ber om ursäkt för eventuella besvär.`;

      return await NotificationUtils.sendMaintenanceNotification(
        userIds,
        startTime,
        endTime
      );
    } catch (error) {
      console.error('Failed to send maintenance notification:', error);
      return false;
    }
  }

  // Send welcome series to new users
  async sendWelcomeSeries(userIds: string[]): Promise<{ success: boolean; results: boolean[] }> {
    try {
      const results: boolean[] = [];

      for (const userId of userIds) {
        // Welcome message (immediate)
        const welcomeResult = await NotificationUtils.sendWelcomeNotification(userId);
        results.push(welcomeResult);

        // Follow-up message (scheduled for 3 days later)
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 3);
        followUpDate.setHours(10, 0, 0, 0); // 10 AM

        const { sendDate, sendTime } = NotificationUtils.formatDateForScheduling(followUpDate);
        
        const followUpResult = await NotificationUtils.scheduleNotification(
          userId,
          'Hur går det? 👋',
          'Vi hoppas att du trivs med Tunisiska Services! Behöver du hjälp med något?',
          sendDate,
          sendTime,
          'followup'
        );
        results.push(followUpResult);

        // Tips message (scheduled for 1 week later)
        const tipsDate = new Date();
        tipsDate.setDate(tipsDate.getDate() + 7);
        tipsDate.setHours(14, 0, 0, 0); // 2 PM

        const { sendDate: tipsSendDate, sendTime: tipsSendTime } = NotificationUtils.formatDateForScheduling(tipsDate);
        
        const tipsResult = await NotificationUtils.scheduleNotification(
          userId,
          'Tips för att få mest av våra tjänster! 💡',
          'Visste du att du kan spåra dina bokningar i realtid? Kolla in din profil för mer information.',
          tipsSendDate,
          tipsSendTime,
          'tips'
        );
        results.push(tipsResult);
      }

      const successCount = results.filter(Boolean).length;
      return {
        success: successCount > 0,
        results
      };
    } catch (error) {
      console.error('Failed to send welcome series:', error);
      return {
        success: false,
        results: []
      };
    }
  }

  // Send re-engagement campaign to inactive users
  async sendReEngagementCampaign(
    inactiveUserIds: string[],
    daysSinceLastActive: number
  ): Promise<boolean> {
    try {
      let title: string;
      let message: string;

      if (daysSinceLastActive <= 7) {
        title = 'Vi saknar dig! 😊';
        message = 'Det har varit en stund sedan vi såg dig. Kolla in våra senaste tjänster!';
      } else if (daysSinceLastActive <= 30) {
        title = 'Specialerbjudande bara för dig! 🎁';
        message = 'Vi har savnat dig! Få 15% rabatt på din nästa bokning med kod WELCOME_BACK';
      } else {
        title = 'Kom tillbaka och få 25% rabatt! 🔥';
        message = 'Vi har missat dig! Som tack för att du kommer tillbaka, få 25% rabatt med kod MISS_YOU';
      }

      const result = await this.sendGlobalAnnouncement(
        title,
        message,
        inactiveUserIds
      );

      return result.success;
    } catch (error) {
      console.error('Failed to send re-engagement campaign:', error);
      return false;
    }
  }

  // Send seasonal/holiday greetings
  async sendSeasonalGreeting(
    userIds: string[],
    occasion: 'christmas' | 'newyear' | 'summer' | 'easter' | 'midsummer'
  ): Promise<boolean> {
    try {
      const greetings = {
        christmas: {
          title: 'God Jul från Tunisiska Services! 🎄',
          message: 'Vi önskar dig och din familj en riktigt God Jul och ett Gott Nytt År! Tack för att du är en del av vår resa.',
        },
        newyear: {
          title: 'Gott Nytt År! 🎊',
          message: 'Vi hoppas att 2024 blir ett fantastiskt år för dig! Låt oss hjälpa dig att göra det ännu bättre med våra tjänster.',
        },
        summer: {
          title: 'Glad Midsommar! ☀️',
          message: 'Vi önskar dig en härlig midsommar! Behöver du hjälp med städning efter festen? Vi är här för dig!',
        },
        easter: {
          title: 'Glad Påsk! 🐣',
          message: 'Vi önskar dig en härlig påskhelg! Njut av tiden med familj och vänner.',
        },
        midsummer: {
          title: 'Glad Midsommar! 🌻',
          message: 'Ha en underbar midsommarhelg! Vi hoppas du får mycket sol och glädje.',
        }
      };

      const greeting = greetings[occasion];
      
      const result = await this.sendGlobalAnnouncement(
        greeting.title,
        greeting.message,
        userIds
      );

      return result.success;
    } catch (error) {
      console.error('Failed to send seasonal greeting:', error);
      return false;
    }
  }

  // Send service feedback request
  async sendServiceFeedbackRequest(
    userIds: string[],
    serviceName: string,
    bookingIds: string[]
  ): Promise<boolean> {
    try {
      const results: boolean[] = [];

      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const bookingId = bookingIds[i] || 'unknown';

        const result = await nativeNotifyAPI.sendNotification({
          title: 'Hur var din upplevelse? ⭐',
          message: `Vi hoppas du var nöjd med ${serviceName}. Din feedback hjälper oss att bli bättre!`,
          subID: userId,
          pushData: {
            type: 'feedback_request',
            action: 'rate_service',
            bookingId,
            serviceName,
            userId
          }
        });

        results.push(result.success);
      }

      const successCount = results.filter(Boolean).length;
      return successCount > 0;
    } catch (error) {
      console.error('Failed to send service feedback request:', error);
      return false;
    }
  }

  // Send emergency/urgent notifications
  async sendEmergencyNotification(
    userIds: string[],
    title: string,
    message: string,
    priority: 'high' | 'urgent' = 'high'
  ): Promise<{ success: boolean; sentCount: number }> {
    try {
      const urgentTitle = priority === 'urgent' ? `🚨 URGENT: ${title}` : `⚠️ ${title}`;
      
      const result = await this.sendGlobalAnnouncement(
        urgentTitle,
        message,
        userIds
      );

      return {
        success: result.success,
        sentCount: result.sentCount
      };
    } catch (error) {
      console.error('Failed to send emergency notification:', error);
      return {
        success: false,
        sentCount: 0
      };
    }
  }

  // Get notification statistics (mock implementation - would integrate with your analytics)
  async getNotificationStats(campaignId?: string): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  }> {
    try {
      // This would typically fetch from your analytics service
      // For now, returning mock data
      return {
        sent: 1000,
        delivered: 950,
        opened: 380,
        clicked: 76
      };
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0
      };
    }
  }

  // Test notification (send to admin/test users only)
  async sendTestNotification(
    testUserIds: string[],
    title: string,
    message: string,
    imageUrl?: string
  ): Promise<boolean> {
    try {
      const testTitle = `[TEST] ${title}`;
      const testMessage = `[Detta är ett test] ${message}`;

      const result = await this.sendGlobalAnnouncement(
        testTitle,
        testMessage,
        testUserIds,
        imageUrl
      );

      return result.success;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }
}

// Export singleton instance
export const adminNotificationHelper = AdminNotificationHelper.getInstance();

// Utility functions for common admin tasks
export const AdminUtils = {
  // Create user segments based on criteria
  createUserSegments: (
    allUsers: Array<{ id: string; registrationDate: Date; lastActive: Date; userType: string; location?: string }>,
    criteria: {
      newUsers?: boolean; // registered in last 7 days
      inactiveUsers?: boolean; // not active in last 30 days
      premiumUsers?: boolean;
      location?: string;
    }
  ): string[] => {
    return allUsers
      .filter(user => {
        if (criteria.newUsers) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (user.registrationDate < sevenDaysAgo) return false;
        }

        if (criteria.inactiveUsers) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (user.lastActive > thirtyDaysAgo) return false;
        }

        if (criteria.premiumUsers && user.userType !== 'premium') {
          return false;
        }

        if (criteria.location && user.location !== criteria.location) {
          return false;
        }

        return true;
      })
      .map(user => user.id);
  },

  // Generate notification preview
  generateNotificationPreview: (template: NotificationTemplate, variables?: Record<string, string>): { title: string; message: string } => {
    let title = template.title;
    let message = template.message;

    if (variables && template.variables) {
      template.variables.forEach(variable => {
        const value = variables[variable] || `[${variable}]`;
        title = title.replace(new RegExp(`{{${variable}}}`, 'g'), value);
        message = message.replace(new RegExp(`{{${variable}}}`, 'g'), value);
      });
    }

    return { title, message };
  }
};

export default AdminNotificationHelper;