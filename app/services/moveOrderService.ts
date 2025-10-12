import { client } from "@/sanityClient";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";

export interface MoveOrderData {
  userId: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  pickupAddress: string;
  deliveryAddress: string;
  scheduledDateTime: string;
  numberOfItems: number;
  numberOfPersons: number;
  hasElevator: boolean;
  itemCategories: string[];
  totalPrice: number;
  pointsUsed?: number;
  paymentMethod: 'stripe' | 'points' | 'combined' | 'cash';
  notes?: string;
  specialRequirements?: string;
  estimatedHours?: number;
}

export class MoveOrderService {
  // Create a new move order in Sanity
  static async createMoveOrder(orderData: MoveOrderData): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('🚛 Creating move order in Sanity:', orderData.customerInfo.name);

      const order = {
        _type: 'moveOrder',
        userId: orderData.userId,
        serviceType: 'move',
        status: 'pending',
        customerInfo: orderData.customerInfo,
        pickupAddress: orderData.pickupAddress,
        deliveryAddress: orderData.deliveryAddress,
        scheduledDateTime: orderData.scheduledDateTime,
        numberOfItems: orderData.numberOfItems,
        numberOfPersons: orderData.numberOfPersons,
        hasElevator: orderData.hasElevator,
        itemCategories: orderData.itemCategories,
        totalPrice: orderData.totalPrice,
        pointsUsed: orderData.pointsUsed || 0,
        paymentMethod: orderData.paymentMethod,
        notes: orderData.notes,
        specialRequirements: orderData.specialRequirements,
        estimatedHours: orderData.estimatedHours,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await client.create(order);
      console.log('✅ Move order created successfully in Sanity:', result._id);

      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error creating move order in Sanity:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Get user's move orders
  static async getUserMoveOrders(userId: string): Promise<{ success: boolean; orders?: any[]; error?: string }> {
    try {
      console.log('🔍 Fetching move orders for user:', userId);

      const orders = await client.fetch(
        `*[_type == "moveOrder" && userId == $userId] | order(createdAt desc)`,
        { userId }
      );

      console.log(`✅ Found ${orders.length} move orders for user`);
      return { success: true, orders };
    } catch (error: any) {
      console.error('💥 Error fetching move orders:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Get move order by ID
  static async getMoveOrder(orderId: string): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('🔍 Fetching move order:', orderId);

      const order = await client.fetch(
        `*[_type == "moveOrder" && _id == $orderId][0]`,
        { orderId }
      );

      if (order) {
        console.log('✅ Move order found');
        return { success: true, order };
      } else {
        console.log('❌ Move order not found');
        return { success: false, error: 'Order not found' };
      }
    } catch (error: any) {
      console.error('💥 Error fetching move order:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Update move order status
  static async updateMoveOrderStatus(orderId: string, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('🔄 Updating move order status:', orderId, status);

      const result = await client
        .patch(orderId)
        .set({
          status,
          updatedAt: new Date().toISOString()
        })
        .commit();

      console.log('✅ Move order status updated successfully');
      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error updating move order status:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Cancel move order
  static async cancelMoveOrder(orderId: string, reason?: string): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('❌ Cancelling move order:', orderId);

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

      console.log('✅ Move order cancelled successfully');
      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error cancelling move order:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Calculate move price based on Swedish moving standards
  static calculateMovePrice(
    numberOfItems: number,
    numberOfPersons: number,
    hasElevator: boolean,
    itemCategories: string[],
    estimatedHours?: number,
    scheduledDateTime?: string
  ): number {
    // Swedish moving pricing based on industry standards
    const BASE_FARE = 800; // SEK - Basic starting fee
    const PRICE_PER_ITEM = 25; // SEK per item
    const PRICE_PER_HOUR = 450; // SEK per hour per person
    const PRICE_PER_PERSON = 200; // SEK per additional person beyond 1
    const MINIMUM_FARE = 1200; // SEK - Minimum charge

    let totalPrice = BASE_FARE;

    // Item-based pricing
    if (numberOfItems > 0) {
      totalPrice += numberOfItems * PRICE_PER_ITEM;
    }

    // Person-based pricing (beyond 1 person)
    if (numberOfPersons > 1) {
      totalPrice += (numberOfPersons - 1) * PRICE_PER_PERSON;
    }

    // Time-based pricing if estimated hours provided
    if (estimatedHours && estimatedHours > 0) {
      totalPrice += estimatedHours * PRICE_PER_HOUR * numberOfPersons;
    } else {
      // Default to 2 hours if not specified
      totalPrice += 2 * PRICE_PER_HOUR * numberOfPersons;
    }

    // Apply minimum fare
    totalPrice = Math.max(totalPrice, MINIMUM_FARE);

    // Surcharges based on conditions
    if (!hasElevator) {
      totalPrice += 200; // No elevator surcharge
    }

    // Heavy items surcharge
    if (itemCategories.includes('heavy_items')) {
      totalPrice *= 1.15; // 15% surcharge for heavy items
    }

    // Time-based surcharges
    if (scheduledDateTime) {
      const bookingTime = new Date(scheduledDateTime);
      const dayOfWeek = bookingTime.getDay();

      // Weekend surcharge (Saturday/Sunday)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        totalPrice *= 1.20; // 20% weekend surcharge
      }
    }

    // Fuel and vehicle surcharge (approximately 10% based on industry standards)
    totalPrice *= 1.10;

    // VAT (25% in Sweden)
    totalPrice *= 1.25;

    return Math.round(totalPrice);
  }

  // Calculate price breakdown for transparency
  static getMovePriceBreakdown(
    numberOfItems: number,
    numberOfPersons: number,
    hasElevator: boolean,
    itemCategories: string[],
    estimatedHours?: number,
    scheduledDateTime?: string
  ): {
    baseFare: number;
    itemCost: number;
    personCost: number;
    timeCost: number;
    surcharges: number;
    subtotal: number;
    vat: number;
    total: number;
  } {
    const BASE_FARE = 800;
    const PRICE_PER_ITEM = 25;
    const PRICE_PER_HOUR = 450;
    const PRICE_PER_PERSON = 200;
    const MINIMUM_FARE = 1200;

    let subtotal = BASE_FARE;

    // Item cost
    const itemCost = numberOfItems * PRICE_PER_ITEM;
    subtotal += itemCost;

    // Person cost
    const personCost = numberOfPersons > 1 ? (numberOfPersons - 1) * PRICE_PER_PERSON : 0;
    subtotal += personCost;

    // Time cost
    const hours = estimatedHours || 2;
    const timeCost = hours * PRICE_PER_HOUR * numberOfPersons;
    subtotal += timeCost;

    // Apply minimum fare
    subtotal = Math.max(subtotal, MINIMUM_FARE);

    let surcharges = 0;

    // No elevator surcharge
    if (!hasElevator) {
      surcharges += 200;
    }

    // Heavy items surcharge
    if (itemCategories.includes('heavy_items')) {
      surcharges += subtotal * 0.15;
    }

    // Time-based surcharges
    if (scheduledDateTime) {
      const bookingTime = new Date(scheduledDateTime);
      const dayOfWeek = bookingTime.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        surcharges += subtotal * 0.20; // Weekend surcharge
      }
    }

    // Fuel and vehicle surcharge
    surcharges += subtotal * 0.10;

    const preVatTotal = subtotal + surcharges;
    const vat = preVatTotal * 0.25;
    const total = preVatTotal + vat;

    return {
      baseFare: BASE_FARE,
      itemCost: Math.round(itemCost),
      personCost: Math.round(personCost),
      timeCost: Math.round(timeCost),
      surcharges: Math.round(surcharges),
      subtotal: Math.round(preVatTotal),
      vat: Math.round(vat),
      total: Math.round(total)
    };
  }

  // Send order confirmation notification
  static async sendOrderConfirmationNotification(userId: string, orderData: MoveOrderData) {
    try {
      const notificationPayload = {
        title: "Flyttbokning bekräftad! 📦",
        message: `Din flytt från ${orderData.pickupAddress} till ${orderData.deliveryAddress} är bokad för ${new Date(orderData.scheduledDateTime).toLocaleString('sv-SE')}. Totalt pris: ${orderData.totalPrice} SEK.`,
        subID: userId,
        pushData: {
          orderId: "new-move-order", // This would be the actual order ID
          type: "move_booking_confirmed",
          paymentMethod: orderData.paymentMethod,
        },
      };

      const result = await nativeNotifyAPI.sendNotification(notificationPayload);
      if (result.success) {
        console.log("Move order confirmation notification sent successfully");
      } else {
        console.error("Failed to send move order confirmation notification:", result.error);
      }
    } catch (error) {
      console.error("Error sending move order confirmation notification:", error);
    }
  }
}