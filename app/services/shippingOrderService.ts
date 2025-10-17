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
        const scheduleDate = new Date(orderData.scheduledDateTime).toISOString().split('T')[0];
        await this.updateShippingScheduleCapacity(scheduleDate, orderData.packageDetails.weight);
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
  static async updateShippingScheduleCapacity(scheduleDate: string, weightUsed: number): Promise<void> {
    try {
      console.log('📦 Updating shipping schedule capacity for date:', scheduleDate, 'weight used:', weightUsed);

      // Find available schedules for the date
      const schedules = await client.fetch(
        `*[_type == "shippingSchedule" && date == $scheduleDate && status == "available"]`,
        { scheduleDate }
      );

      if (schedules.length > 0) {
        // Update the first available schedule's capacity
        const schedule = schedules[0];
        const newAvailableCapacity = Math.max(0, (schedule.availableCapacity || schedule.capacity) - weightUsed);

        await client
          .patch(schedule._id)
          .set({
            availableCapacity: newAvailableCapacity,
            status: newAvailableCapacity <= 0 ? 'full' : 'available'
          })
          .commit();

        console.log('✅ Shipping schedule capacity updated');
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
    // Swedish shipping pricing based on industry standards
    const BASE_FARE = 80; // SEK - Basic starting fee
    const PRICE_PER_KG = 25; // SEK per kilogram
    const MINIMUM_FARE = 120; // SEK - Minimum charge

    let totalPrice = BASE_FARE;

    // Weight-based pricing
    if (weight > 0) {
      totalPrice += weight * PRICE_PER_KG;
    }

    // Apply minimum fare
    totalPrice = Math.max(totalPrice, MINIMUM_FARE);

    // Shipping speed multipliers
    switch (shippingSpeed) {
      case 'express':
        totalPrice *= 1.5; // 50% surcharge for express
        break;
      case 'overnight':
        totalPrice *= 2; // 100% surcharge for overnight
        break;
      default: // standard
        // No additional charge
        break;
    }

    // Fragile items surcharge
    if (isFragile) {
      totalPrice += 50; // Fixed surcharge for fragile items
    }

    // Insurance surcharge (5% of insured value)
    if (insuranceValue && insuranceValue > 0) {
      totalPrice += insuranceValue * 0.05;
    }

    // Time-based surcharges
    if (scheduledDateTime) {
      const bookingTime = new Date(scheduledDateTime);
      const dayOfWeek = bookingTime.getDay();

      // Weekend surcharge (Saturday/Sunday)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        totalPrice *= 1.15; // 15% weekend surcharge
      }
    }

    // Fuel and handling surcharge (approximately 8% based on industry standards)
    totalPrice *= 1.08;

    // VAT (25% in Sweden)
    totalPrice *= 1.25;

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