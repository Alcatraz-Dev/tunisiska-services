import { client } from "@/sanityClient";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";

export interface ShippingOrderData {
  userId: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  pickupAddress: string;
  deliveryAddress: string;
  scheduledDateTime: string;
  packageDetails: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    description: string;
    value: number;
    isFragile: boolean;
  };
  shippingSpeed: 'standard' | 'express' | 'overnight';
  requiresSignature: boolean;
  insuranceValue?: number;
  totalPrice: number;
  pointsUsed?: number;
  paymentMethod: 'stripe' | 'points' | 'combined' | 'cash';
  notes?: string;
}

export class ShippingOrderService {
  // Create a new shipping order in Sanity
  static async createShippingOrder(orderData: ShippingOrderData): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('📦 Creating shipping order in Sanity:', orderData.customerInfo.name);

      const order = {
        _type: 'shippingOrder',
        userId: orderData.userId,
        serviceType: 'shipping',
        status: 'pending',
        customerInfo: orderData.customerInfo,
        pickupAddress: orderData.pickupAddress,
        deliveryAddress: orderData.deliveryAddress,
        scheduledDateTime: orderData.scheduledDateTime,
        packageDetails: orderData.packageDetails,
        shippingSpeed: orderData.shippingSpeed,
        requiresSignature: orderData.requiresSignature,
        insuranceValue: orderData.insuranceValue,
        totalPrice: orderData.totalPrice,
        pointsUsed: orderData.pointsUsed || 0,
        paymentMethod: orderData.paymentMethod,
        notes: orderData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await client.create(order);
      console.log('✅ Shipping order created successfully in Sanity:', result._id);

      // Update shipping schedule capacity
      if (orderData.scheduledDateTime) {
        await this.updateShippingScheduleCapacity(orderData.scheduledDateTime, orderData.packageDetails.weight);
      }

      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error creating shipping order in Sanity:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Update shipping schedule capacity when order is created
  static async updateShippingScheduleCapacity(scheduledDateTime: string, weightUsed: number): Promise<void> {
    try {
      console.log('📦 Updating shipping schedule capacity for datetime:', scheduledDateTime, 'weight used:', weightUsed);

      // Parse the scheduled date and time
      const scheduledDate = new Date(scheduledDateTime);
      const scheduleDate = scheduledDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      const scheduleTime = scheduledDate.toTimeString().split(' ')[0]; // HH:MM:SS format

      console.log('📦 Looking for schedule on date:', scheduleDate, 'around time:', scheduleTime);

      // Find available schedules for the date and time
      const schedules = await client.fetch(
        `*[_type == "shippingSchedule" && date == $scheduleDate && status == "available"]`,
        { scheduleDate }
      );

      console.log('📦 Found', schedules.length, 'available schedules for date:', scheduleDate);

      if (schedules.length > 0) {
        // Find the schedule that matches the time closest to the scheduled time
        let bestMatch = schedules[0];
        let smallestTimeDiff = Infinity;

        for (const schedule of schedules) {
          if (schedule.departureTime) {
            const scheduleDeparture = new Date(schedule.departureTime);
            const timeDiff = Math.abs(scheduleDeparture.getTime() - scheduledDate.getTime());
            if (timeDiff < smallestTimeDiff) {
              smallestTimeDiff = timeDiff;
              bestMatch = schedule;
            }
          }
        }

        console.log('📦 Best matching schedule:', bestMatch._id, 'with departure time:', bestMatch.departureTime);

        // Update the best matching schedule's capacity
        const currentCapacity = bestMatch.availableCapacity || bestMatch.capacity || 0;
        const newAvailableCapacity = Math.max(0, currentCapacity - weightUsed);

        console.log('📦 Updating capacity from', currentCapacity, 'kg to', newAvailableCapacity, 'kg');

        await client
          .patch(bestMatch._id)
          .set({
            availableCapacity: newAvailableCapacity,
            status: newAvailableCapacity <= 0 ? 'full' : 'available'
          })
          .commit();

        console.log('✅ Shipping schedule capacity updated successfully');
      } else {
        console.log('⚠️ No available shipping schedules found for the selected date and time');
      }
    } catch (error: any) {
      console.error('💥 Error updating shipping schedule capacity:', error);
    }
  }

  // Get user's shipping orders
  static async getUserShippingOrders(userId: string): Promise<{ success: boolean; orders?: any[]; error?: string }> {
    try {
      console.log('🔍 Fetching shipping orders for user:', userId);

      const orders = await client.fetch(
        `*[_type == "shippingOrder" && userId == $userId] | order(createdAt desc)`,
        { userId }
      );

      console.log(`✅ Found ${orders.length} shipping orders for user`);
      return { success: true, orders };
    } catch (error: any) {
      console.error('💥 Error fetching shipping orders:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Get all active shipping orders (for public map view)
  static async getAllActiveShippingOrders(): Promise<{ success: boolean; orders?: any[]; error?: string }> {
    try {
      console.log('🔍 Fetching all active shipping orders for public map view');

      const orders = await client.fetch(
        `*[_type == "shippingOrder" && (status == "confirmed" || status == "in_progress")] | order(createdAt desc)`
      );

      console.log(`✅ Found ${orders.length} active shipping orders`);
      return { success: true, orders };
    } catch (error: any) {
      console.error('💥 Error fetching active shipping orders:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Get shipping order by ID
  static async getShippingOrder(orderId: string): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('🔍 Fetching shipping order:', orderId);

      const order = await client.fetch(
        `*[_type == "shippingOrder" && _id == $orderId][0]`,
        { orderId }
      );

      if (order) {
        console.log('✅ Shipping order found');
        return { success: true, order };
      } else {
        console.log('❌ Shipping order not found');
        return { success: false, error: 'Order not found' };
      }
    } catch (error: any) {
      console.error('💥 Error fetching shipping order:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Update shipping order status
  static async updateShippingOrderStatus(orderId: string, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('🔄 Updating shipping order status:', orderId, status);

      const result = await client
        .patch(orderId)
        .set({
          status,
          updatedAt: new Date().toISOString()
        })
        .commit();

      console.log('✅ Shipping order status updated successfully');
      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error updating shipping order status:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Cancel shipping order
  static async cancelShippingOrder(orderId: string, reason?: string): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('❌ Cancelling shipping order:', orderId);

      const updateData: any = {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      };

      if (reason) {
        updateData.notes = (updateData.notes ? updateData.notes + '\n' : '') + `Cancellation reason: ${reason}`;
      }

      const result = await client
        .patch(orderId)
        .set(updateData)
        .commit();

      console.log('✅ Shipping order cancelled successfully');
      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error cancelling shipping order:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Calculate shipping price based on Swedish shipping standards
  static calculateShippingPrice(
    weight: number,
    shippingSpeed: 'standard' | 'express' | 'overnight',
    isFragile: boolean = false,
    insuranceValue?: number,
    scheduledDateTime?: string
  ): number {
    // Simple pricing: 50 SEK per kg
    let totalPrice = weight * 50;

    return Math.round(totalPrice);
  }

  // Calculate price breakdown for transparency
  static getShippingPriceBreakdown(
    weight: number,
    shippingSpeed: 'standard' | 'express' | 'overnight',
    isFragile: boolean = false,
    insuranceValue?: number,
    scheduledDateTime?: string
  ): {
    baseFare: number;
    weightCost: number;
    speedSurcharge: number;
    additionalCharges: number;
    subtotal: number;
    vat: number;
    total: number;
  } {
    const BASE_FARE = 80;
    const PRICE_PER_KG = 25;
    const MINIMUM_FARE = 120;

    let subtotal = BASE_FARE;

    // Weight cost
    const weightCost = weight * PRICE_PER_KG;
    subtotal += weightCost;

    // Apply minimum fare
    subtotal = Math.max(subtotal, MINIMUM_FARE);

    const baseSubtotal = subtotal;

    // Shipping speed surcharge
    let speedSurcharge = 0;
    switch (shippingSpeed) {
      case 'express':
        speedSurcharge = subtotal * 0.5;
        break;
      case 'overnight':
        speedSurcharge = subtotal * 1;
        break;
    }
    subtotal += speedSurcharge;

    // Additional charges
    let additionalCharges = 0;

    // Fragile items surcharge
    if (isFragile) {
      additionalCharges += 50;
    }

    // Insurance surcharge
    if (insuranceValue && insuranceValue > 0) {
      additionalCharges += insuranceValue * 0.05;
    }

    // Time-based surcharges
    if (scheduledDateTime) {
      const bookingTime = new Date(scheduledDateTime);
      const dayOfWeek = bookingTime.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        additionalCharges += subtotal * 0.15;
      }
    }

    // Fuel and handling surcharge
    additionalCharges += subtotal * 0.08;

    const preVatTotal = subtotal + additionalCharges;
    const vat = preVatTotal * 0.25;
    const total = preVatTotal + vat;

    return {
      baseFare: BASE_FARE,
      weightCost: Math.round(weightCost),
      speedSurcharge: Math.round(speedSurcharge),
      additionalCharges: Math.round(additionalCharges),
      subtotal: Math.round(preVatTotal),
      vat: Math.round(vat),
      total: Math.round(total)
    };
  }


  // Send order confirmation notification
  static async sendOrderConfirmationNotification(userId: string, orderData: ShippingOrderData) {
    try {
      const notificationPayload = {
        title: "Fraktbokning bekräftad! 📦",
        message: `Din frakt från ${orderData.pickupAddress} till ${orderData.deliveryAddress} är bokad för ${new Date(orderData.scheduledDateTime).toLocaleString('sv-SE')}. Totalt pris: ${orderData.totalPrice} SEK.`,
        subID: userId,
        pushData: {
          orderId: "new-shipping-order", // This would be the actual order ID
          type: "shipping_booking_confirmed",
          paymentMethod: orderData.paymentMethod,
        },
      };

      const result = await nativeNotifyAPI.sendNotification(notificationPayload);
      if (result.success) {
        console.log("Shipping order confirmation notification sent successfully");
      } else {
        console.error("Failed to send shipping order confirmation notification:", result.error);
      }
    } catch (error) {
      console.error("Error sending shipping order confirmation notification:", error);
    }
  }
}