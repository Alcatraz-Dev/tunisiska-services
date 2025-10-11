import { nativeNotifyAPI, NotificationPayload, BulkNotificationPayload, ScheduledNotificationPayload } from '../services/nativeNotifyApi';

// Predefined notification templates
export const NotificationTemplates = {
  // Welcome & Onboarding
  WELCOME: {
    title: 'Välkommen till Tunisiska Services! 👋',
    message: 'Vi är glada att ha dig här! Utforska våra tjänster och boka din första service idag.',
    pushData: { type: 'welcome', action: 'open_services' }
  },

  ONBOARDING_COMPLETE: {
    title: 'Profil slutförd! ✅',
    message: 'Din profil är nu komplett. Du kan nu boka alla våra tjänster.',
    pushData: { type: 'onboarding', action: 'open_profile' }
  },

  // Booking Related
  BOOKING_CONFIRMED: {
    title: 'Bokning bekräftad 📅',
    message: 'Din bokning har bekräftats. Vi ser fram emot att hjälpa dig!',
    pushData: { type: 'booking', action: 'view_booking' }
  },

  BOOKING_REMINDER: {
    title: 'Påminnelse: Din service imorgon ⏰',
    message: 'Glöm inte din bokade service imorgon. Vi ser fram emot att träffa dig!',
    pushData: { type: 'reminder', action: 'view_booking' }
  },

  BOOKING_COMPLETED: {
    title: 'Service slutförd ✨',
    message: 'Tack för att du använde våra tjänster! Lämna gärna en recension.',
    pushData: { type: 'completion', action: 'rate_service' }
  },

  BOOKING_CANCELLED: {
    title: 'Bokning avbruten ❌',
    message: 'Din bokning har avbrutits. Kontakta oss om du har frågor.',
    pushData: { type: 'cancellation', action: 'contact_support' }
  },

  // Payment & Billing
  PAYMENT_CONFIRMED: {
    title: 'Betalning mottagen 💳',
    message: 'Din betalning har behandlats framgångsrikt. Tack!',
    pushData: { type: 'payment', action: 'view_receipt' }
  },

  PAYMENT_FAILED: {
    title: 'Betalning misslyckades 💳',
    message: 'Vi kunde inte behandla din betalning. Vänligen uppdatera dina betalningsuppgifter.',
    pushData: { type: 'payment_error', action: 'update_payment' }
  },

  // Promotions & Offers
  SPECIAL_OFFER: {
    title: 'Specialerbjudande! 🎉',
    message: 'Få 20% rabatt på din nästa bokning. Erbjudandet gäller till måndag!',
    pushData: { type: 'promotion', action: 'view_offers' }
  },

  NEW_SERVICE: {
    title: 'Ny tjänst tillgänglig! 🆕',
    message: 'Vi har lagt till en ny tjänst som du kanske gillar. Kolla in den nu!',
    pushData: { type: 'new_service', action: 'view_services' }
  },

  // System & Updates
  MAINTENANCE_NOTICE: {
    title: 'Systemunderhåll 🔧',
    message: 'Appen kommer att vara otillgänglig för underhåll mellan 02:00-04:00.',
    pushData: { type: 'maintenance', action: 'none' }
  },

  APP_UPDATE: {
    title: 'Uppdatering tillgänglig 📱',
    message: 'En ny version av appen är tillgänglig med förbättringar och bugfixar.',
    pushData: { type: 'update', action: 'update_app' }
  },

  // Support & Help
  MESSAGE_FROM_SUPPORT: {
    title: 'Meddelande från support 💬',
    message: 'Vi har svarat på ditt meddelande. Kolla dina meddelanden för mer info.',
    pushData: { type: 'support', action: 'view_messages' }
  }
};

// Notification utility class
export class NotificationUtils {
  
  // Send welcome notification to new user
  static async sendWelcomeNotification(userId: string, userName?: string): Promise<boolean> {
    try {
      const template = NotificationTemplates.WELCOME;
      const customMessage = userName 
        ? `Hej ${userName}! Vi är glada att ha dig här! Utforska våra tjänster och boka din första service idag.`
        : template.message;

      const result = await nativeNotifyAPI.sendNotification({
        title: template.title,
        message: customMessage,
        subID: userId,
        pushData: { ...template.pushData, userId }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send welcome notification:', error);
      return false;
    }
  }

  // Send booking confirmation
  static async sendBookingConfirmation(
    userId: string, 
    bookingId: string, 
    serviceName: string, 
    bookingDate: string
  ): Promise<boolean> {
    try {
      const result = await nativeNotifyAPI.sendNotification({
        title: 'Bokning bekräftad 📅',
        message: `Din ${serviceName} är bokad för ${bookingDate}. Bokningsnummer: ${bookingId}`,
        subID: userId,
        pushData: { 
          type: 'booking', 
          action: 'view_booking',
          bookingId,
          serviceName,
          userId 
        }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send booking confirmation:', error);
      return false;
    }
  }

  // Send booking reminder
  static async sendBookingReminder(
    userId: string, 
    bookingId: string, 
    serviceName: string, 
    timeUntil: string
  ): Promise<boolean> {
    try {
      const result = await nativeNotifyAPI.sendNotification({
        title: 'Påminnelse: Din service snart! ⏰',
        message: `Din ${serviceName} börjar ${timeUntil}. Vi ser fram emot att hjälpa dig!`,
        subID: userId,
        pushData: { 
          type: 'reminder', 
          action: 'view_booking',
          bookingId,
          serviceName,
          userId 
        }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send booking reminder:', error);
      return false;
    }
  }

  // Send payment confirmation
  static async sendPaymentConfirmation(
    userId: string, 
    amount: string, 
    paymentId: string,
    serviceName?: string
  ): Promise<boolean> {
    try {
      const serviceText = serviceName ? ` för ${serviceName}` : '';
      const result = await nativeNotifyAPI.sendNotification({
        title: 'Betalning mottagen 💳',
        message: `Betalning på ${amount} SEK${serviceText} har mottagits. Betalnings-ID: ${paymentId}`,
        subID: userId,
        pushData: { 
          type: 'payment', 
          action: 'view_receipt',
          paymentId,
          amount,
          serviceName,
          userId 
        }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send payment confirmation:', error);
      return false;
    }
  }

  // Send promotional notification
  static async sendPromotionalNotification(
    userId: string,
    title: string,
    message: string,
    promoCode?: string,
    imageUrl?: string
  ): Promise<boolean> {
    try {
      const result = await nativeNotifyAPI.sendNotification({
        title,
        message,
        subID: userId,
        bigPictureURL: imageUrl,
        pushData: { 
          type: 'promotion', 
          action: 'view_offers',
          promoCode,
          userId 
        }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send promotional notification:', error);
      return false;
    }
  }

  // Send bulk notification to multiple users
  static async sendBulkNotification(
    userIds: string[],
    title: string,
    message: string,
    type: string = 'announcement',
    imageUrl?: string
  ): Promise<boolean> {
    try {
      const result = await nativeNotifyAPI.sendBulkNotification({
        title,
        message,
        subIDs: userIds,
        bigPictureURL: imageUrl,
        pushData: { type, action: 'open_app' }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send bulk notification:', error);
      return false;
    }
  }

  // Schedule a notification for later
  static async scheduleNotification(
    userId: string,
    title: string,
    message: string,
    sendDate: string, // MM-DD-YYYY
    sendTime: string, // HH:MM AM/PM
    type: string = 'scheduled'
  ): Promise<boolean> {
    try {
      const result = await nativeNotifyAPI.scheduleNotification({
        title,
        message,
        subID: userId,
        sendDate,
        sendTime,
        timezone: 'Europe/Stockholm', // Swedish timezone
        pushData: { type, action: 'open_app', userId }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return false;
    }
  }

  // Send service completion notification
  static async sendServiceCompletionNotification(
    userId: string,
    serviceName: string,
    bookingId: string
  ): Promise<boolean> {
    try {
      const result = await nativeNotifyAPI.sendNotification({
        title: 'Service slutförd ✨',
        message: `${serviceName} är nu slutförd! Tack för att du valde oss. Lämna gärna en recension.`,
        subID: userId,
        pushData: { 
          type: 'completion', 
          action: 'rate_service',
          bookingId,
          serviceName,
          userId 
        }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send service completion notification:', error);
      return false;
    }
  }

  // Send system maintenance notification
  static async sendMaintenanceNotification(
    userIds: string[],
    maintenanceStart: string,
    maintenanceEnd: string
  ): Promise<boolean> {
    try {
      const result = await nativeNotifyAPI.sendBulkNotification({
        title: 'Systemunderhåll 🔧',
        message: `Appen kommer att vara otillgänglig för underhåll mellan ${maintenanceStart} och ${maintenanceEnd}. Vi ber om ursäkt för eventuella besvär.`,
        subIDs: userIds,
        pushData: { type: 'maintenance', action: 'none' }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send maintenance notification:', error);
      return false;
    }
  }

  // Send support message notification
  static async sendSupportMessageNotification(
    userId: string,
    supportAgent?: string
  ): Promise<boolean> {
    try {
      const agentText = supportAgent ? ` från ${supportAgent}` : '';
      const result = await nativeNotifyAPI.sendNotification({
        title: 'Meddelande från support 💬',
        message: `Du har fått ett nytt meddelande${agentText}. Kolla dina meddelanden för mer info.`,
        subID: userId,
        pushData: { 
          type: 'support', 
          action: 'view_messages',
          supportAgent,
          userId 
        }
      });

      return result.success;
    } catch (error) {
      console.error('Failed to send support message notification:', error);
      return false;
    }
  }

  // Helper function to format date for scheduling
  static formatDateForScheduling(date: Date): { sendDate: string; sendTime: string } {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    return {
      sendDate: `${month}-${day}-${year}`,
      sendTime: `${hours}:${minutes} ${ampm}`
    };
  }

  // Helper function to schedule booking reminders
  static async scheduleBookingReminders(
    userId: string,
    bookingId: string,
    serviceName: string,
    bookingDate: Date
  ): Promise<boolean[]> {
    try {
      const results: boolean[] = [];
      
      // 24 hours before
      const reminder24h = new Date(bookingDate);
      reminder24h.setHours(reminder24h.getHours() - 24);
      
      if (reminder24h > new Date()) {
        const { sendDate, sendTime } = this.formatDateForScheduling(reminder24h);
        const result24h = await this.scheduleNotification(
          userId,
          'Påminnelse: Service imorgon ⏰',
          `Din ${serviceName} är bokad imorgon. Vi ser fram emot att hjälpa dig!`,
          sendDate,
          sendTime,
          'reminder_24h'
        );
        results.push(result24h);
      }
      
      // 2 hours before
      const reminder2h = new Date(bookingDate);
      reminder2h.setHours(reminder2h.getHours() - 2);
      
      if (reminder2h > new Date()) {
        const { sendDate, sendTime } = this.formatDateForScheduling(reminder2h);
        const result2h = await this.scheduleNotification(
          userId,
          'Påminnelse: Service om 2 timmar ⏰',
          `Din ${serviceName} börjar om 2 timmar. Har du allt förberett?`,
          sendDate,
          sendTime,
          'reminder_2h'
        );
        results.push(result2h);
      }
      
      return results;
    } catch (error) {
      console.error('Failed to schedule booking reminders:', error);
      return [];
    }
  }
}

export default NotificationUtils;