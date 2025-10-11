/**
 * Native Notify API Examples
 * 
 * This file demonstrates how to use the new Native Notify API system
 * for sending different types of notifications in your Expo app.
 */

import { nativeNotifyAPI } from '../services/nativeNotifyApi';
import { NotificationUtils } from '../utils/notificationUtils';
import { adminNotificationHelper } from '../utils/adminNotificationHelper';

// Example 1: Register a user for notifications
export async function registerUserExample(userId: string, expoPushToken?: string) {
  console.log('🔄 Registering user for notifications...');
  
  const result = await nativeNotifyAPI.registerUser(userId, expoPushToken);
  
  if (result.success) {
    console.log('✅ User registered successfully:', result.message);
    
    // Send welcome notification
    const welcomeSent = await NotificationUtils.sendWelcomeNotification(userId, 'John');
    console.log(welcomeSent ? '✅ Welcome notification sent' : '❌ Failed to send welcome notification');
  } else {
    console.error('❌ Failed to register user:', result.error);
  }
}

// Example 2: Send booking confirmation
export async function bookingConfirmationExample() {
  console.log('🔄 Sending booking confirmation...');
  
  const success = await NotificationUtils.sendBookingConfirmation(
    'user_123',
    'booking_456',
    'Städning',
    '2024-10-15 kl 14:00'
  );
  
  console.log(success ? '✅ Booking confirmation sent' : '❌ Failed to send booking confirmation');
}

// Example 3: Schedule booking reminders
export async function scheduleBookingRemindersExample() {
  console.log('🔄 Scheduling booking reminders...');
  
  const bookingDate = new Date('2024-10-15T14:00:00');
  
  const results = await NotificationUtils.scheduleBookingReminders(
    'user_123',
    'booking_456',
    'Städning',
    bookingDate
  );
  
  const successCount = results.filter(Boolean).length;
  console.log(`✅ Scheduled ${successCount} reminders out of ${results.length}`);
}

// Example 4: Send promotional notification
export async function promotionalNotificationExample() {
  console.log('🔄 Sending promotional notification...');
  
  const success = await NotificationUtils.sendPromotionalNotification(
    'user_123',
    'Specialerbjudande! 🎉',
    'Få 20% rabatt på städning med kod CLEAN20. Gäller till söndag!',
    'CLEAN20',
    'https://example.com/promo-image.jpg'
  );
  
  console.log(success ? '✅ Promotional notification sent' : '❌ Failed to send promotional notification');
}

// Example 5: Send bulk announcement (Admin)
export async function bulkAnnouncementExample() {
  console.log('🔄 Sending bulk announcement...');
  
  const userIds = ['user_123', 'user_456', 'user_789'];
  
  const result = await adminNotificationHelper.sendGlobalAnnouncement(
    'Viktigt meddelande! 📢',
    'Vi har uppdaterat våra tjänster med nya funktioner. Kolla in vad som är nytt!',
    userIds,
    'https://example.com/announcement-image.jpg'
  );
  
  console.log(`📊 Announcement results:`, {
    success: result.success,
    sentCount: result.sentCount,
    failedCount: result.failedCount
  });
}

// Example 6: Send welcome series to new users (Admin)
export async function welcomeSeriesExample() {
  console.log('🔄 Sending welcome series to new users...');
  
  const newUserIds = ['user_new1', 'user_new2', 'user_new3'];
  
  const result = await adminNotificationHelper.sendWelcomeSeries(newUserIds);
  
  console.log(`📊 Welcome series results:`, {
    success: result.success,
    totalOperations: result.results.length,
    successfulOperations: result.results.filter(Boolean).length
  });
}

// Example 7: Send re-engagement campaign (Admin)
export async function reEngagementCampaignExample() {
  console.log('🔄 Sending re-engagement campaign...');
  
  const inactiveUserIds = ['user_inactive1', 'user_inactive2'];
  const daysSinceLastActive = 15;
  
  const success = await adminNotificationHelper.sendReEngagementCampaign(
    inactiveUserIds,
    daysSinceLastActive
  );
  
  console.log(success ? '✅ Re-engagement campaign sent' : '❌ Failed to send re-engagement campaign');
}

// Example 8: Send seasonal greeting (Admin)
export async function seasonalGreetingExample() {
  console.log('🔄 Sending seasonal greeting...');
  
  const userIds = ['user_123', 'user_456', 'user_789'];
  
  const success = await adminNotificationHelper.sendSeasonalGreeting(
    userIds,
    'christmas'
  );
  
  console.log(success ? '✅ Christmas greeting sent' : '❌ Failed to send Christmas greeting');
}

// Example 9: Send maintenance notification (Admin)
export async function maintenanceNotificationExample() {
  console.log('🔄 Sending maintenance notification...');
  
  const allUserIds = ['user_123', 'user_456', 'user_789', 'user_abc'];
  
  const success = await adminNotificationHelper.sendMaintenanceNotification(
    allUserIds,
    '02:00',
    '04:00',
    'Vi kommer att uppdatera våra servrar för bättre prestanda.'
  );
  
  console.log(success ? '✅ Maintenance notification sent' : '❌ Failed to send maintenance notification');
}

// Example 10: Send test notification (Admin)
export async function testNotificationExample() {
  console.log('🔄 Sending test notification...');
  
  const testUserIds = ['admin_user_123']; // Only send to admin/test users
  
  const success = await adminNotificationHelper.sendTestNotification(
    testUserIds,
    'Test Notification',
    'This is a test message to verify the notification system is working properly.',
    'https://example.com/test-image.jpg'
  );
  
  console.log(success ? '✅ Test notification sent' : '❌ Failed to send test notification');
}

// Example 11: Get notification statistics (Admin)
export async function getNotificationStatsExample() {
  console.log('🔄 Getting notification statistics...');
  
  const stats = await adminNotificationHelper.getNotificationStats('campaign_123');
  
  console.log('📊 Notification Statistics:', {
    sent: stats.sent,
    delivered: stats.delivered,
    opened: stats.opened,
    clicked: stats.clicked,
    openRate: ((stats.opened / stats.delivered) * 100).toFixed(2) + '%',
    clickRate: ((stats.clicked / stats.opened) * 100).toFixed(2) + '%'
  });
}

// Example 12: Complete booking flow with notifications
export async function completeBookingFlowExample() {
  console.log('🔄 Running complete booking flow with notifications...');
  
  const userId = 'user_123';
  const bookingId = 'booking_789';
  const serviceName = 'Flyttstädning';
  const bookingDate = new Date('2024-10-20T10:00:00');
  const amount = '1299';
  const paymentId = 'payment_456';
  
  try {
    // 1. Send booking confirmation
    console.log('1️⃣ Sending booking confirmation...');
    await NotificationUtils.sendBookingConfirmation(
      userId,
      bookingId,
      serviceName,
      bookingDate.toLocaleDateString('sv-SE') + ' kl ' + bookingDate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
    );
    
    // 2. Schedule reminders
    console.log('2️⃣ Scheduling reminders...');
    await NotificationUtils.scheduleBookingReminders(
      userId,
      bookingId,
      serviceName,
      bookingDate
    );
    
    // 3. Send payment confirmation
    console.log('3️⃣ Sending payment confirmation...');
    await NotificationUtils.sendPaymentConfirmation(
      userId,
      amount,
      paymentId,
      serviceName
    );
    
    // 4. Send service completion notification (simulate completion)
    console.log('4️⃣ Sending service completion notification...');
    setTimeout(async () => {
      await NotificationUtils.sendServiceCompletionNotification(
        userId,
        serviceName,
        bookingId
      );
      console.log('✅ Complete booking flow finished');
    }, 2000); // Simulate 2 second delay
    
  } catch (error) {
    console.error('❌ Error in booking flow:', error);
  }
}

// Example 13: Emergency notification (Admin)
export async function emergencyNotificationExample() {
  console.log('🔄 Sending emergency notification...');
  
  const allUserIds = ['user_123', 'user_456', 'user_789'];
  
  const result = await adminNotificationHelper.sendEmergencyNotification(
    allUserIds,
    'Tjänsteavbrott',
    'På grund av tekniska problem är bokningssystemet tillfälligt otillgängligt. Vi arbetar på en lösning.',
    'urgent'
  );
  
  console.log(`🚨 Emergency notification results:`, {
    success: result.success,
    sentCount: result.sentCount
  });
}

// Example usage function that runs all examples
export async function runAllExamples() {
  console.log('🚀 Running all Native Notify API examples...\n');
  
  try {
    await registerUserExample('user_123', 'ExponentPushToken[example-token]');
    console.log('---\n');
    
    await bookingConfirmationExample();
    console.log('---\n');
    
    await scheduleBookingRemindersExample();
    console.log('---\n');
    
    await promotionalNotificationExample();
    console.log('---\n');
    
    await bulkAnnouncementExample();
    console.log('---\n');
    
    await welcomeSeriesExample();
    console.log('---\n');
    
    await reEngagementCampaignExample();
    console.log('---\n');
    
    await seasonalGreetingExample();
    console.log('---\n');
    
    await maintenanceNotificationExample();
    console.log('---\n');
    
    await testNotificationExample();
    console.log('---\n');
    
    await getNotificationStatsExample();
    console.log('---\n');
    
    await completeBookingFlowExample();
    console.log('---\n');
    
    await emergencyNotificationExample();
    console.log('---\n');
    
    console.log('🎉 All examples completed!');
    
  } catch (error) {
    console.error('💥 Error running examples:', error);
  }
}

// Uncomment the line below to run all examples when this file is imported
// runAllExamples();