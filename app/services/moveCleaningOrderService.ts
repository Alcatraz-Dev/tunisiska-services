import { client } from "@/sanityClient";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";

export interface MoveCleaningOrderData {
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
  cleaningAreas: string[];
  cleaningIntensity: 'basic' | 'deep' | 'move_out';
  cleaningSupplies: boolean;
  totalPrice: number;
  pointsUsed?: number;
  paymentMethod: 'stripe' | 'points' | 'combined' | 'cash';
  notes?: string;
  specialRequirements?: string;
  estimatedHours?: number;
}

export class MoveCleaningOrderService {
  // Create a new move cleaning order in Sanity
  static async createMoveCleaningOrder(orderData: MoveCleaningOrderData): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('🧹 Creating move cleaning order in Sanity:', orderData.customerInfo.name);

      const order = {
        _type: 'moveCleaningOrder',
        userId: orderData.userId,
        serviceType: 'move_cleaning',
        status: 'pending',
        customerInfo: orderData.customerInfo,
        pickupAddress: orderData.pickupAddress,
        deliveryAddress: orderData.deliveryAddress,
        scheduledDateTime: orderData.scheduledDateTime,
        numberOfItems: orderData.numberOfItems,
        numberOfPersons: orderData.numberOfPersons,
        hasElevator: orderData.hasElevator,
        itemCategories: orderData.itemCategories,
        cleaningAreas: orderData.cleaningAreas,
        cleaningIntensity: orderData.cleaningIntensity,
        cleaningSupplies: orderData.cleaningSupplies,
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
      console.log('✅ Move cleaning order created successfully in Sanity:', result._id);

      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error creating move cleaning order in Sanity:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Get user's move cleaning orders
  static async getUserMoveCleaningOrders(userId: string): Promise<{ success: boolean; orders?: any[]; error?: string }> {
    try {
      console.log('🔍 Fetching move cleaning orders for user:', userId);

      const orders = await client.fetch(
        `*[_type == "moveCleaningOrder" && userId == $userId] | order(createdAt desc)`,
        { userId }
      );

      console.log(`✅ Found ${orders.length} move cleaning orders for user`);
      return { success: true, orders };
    } catch (error: any) {
      console.error('💥 Error fetching move cleaning orders:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Get move cleaning order by ID
  static async getMoveCleaningOrder(orderId: string): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('🔍 Fetching move cleaning order:', orderId);

      const order = await client.fetch(
        `*[_type == "moveCleaningOrder" && _id == $orderId][0]`,
        { orderId }
      );

      if (order) {
        console.log('✅ Move cleaning order found');
        return { success: true, order };
      } else {
        console.log('❌ Move cleaning order not found');
        return { success: false, error: 'Order not found' };
      }
    } catch (error: any) {
      console.error('💥 Error fetching move cleaning order:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Update move cleaning order status
  static async updateMoveCleaningOrderStatus(orderId: string, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('🔄 Updating move cleaning order status:', orderId, status);

      const result = await client
        .patch(orderId)
        .set({
          status,
          updatedAt: new Date().toISOString()
        })
        .commit();

      console.log('✅ Move cleaning order status updated successfully');
      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error updating move cleaning order status:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Cancel move cleaning order
  static async cancelMoveCleaningOrder(orderId: string, reason?: string): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('❌ Cancelling move cleaning order:', orderId);

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

      console.log('✅ Move cleaning order cancelled successfully');
      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error cancelling move cleaning order:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Calculate move cleaning price based on Swedish moving and cleaning standards
  static calculateMoveCleaningPrice(
    numberOfItems: number,
    numberOfPersons: number,
    hasElevator: boolean,
    itemCategories: string[],
    cleaningAreas: string[],
    cleaningIntensity: 'basic' | 'deep' | 'move_out',
    cleaningSupplies: boolean,
    estimatedHours?: number,
    scheduledDateTime?: string
  ): number {
    // Swedish moving and cleaning pricing based on industry standards
    const BASE_MOVE_FARE = 800; // SEK - Basic moving starting fee
    const BASE_CLEANING_FARE = 300; // SEK - Basic cleaning starting fee
    const PRICE_PER_ITEM = 25; // SEK per item
    const PRICE_PER_HOUR_MOVE = 450; // SEK per hour per person for moving
    const PRICE_PER_HOUR_CLEANING = 180; // SEK per hour for cleaning
    const PRICE_PER_PERSON = 200; // SEK per additional person beyond 1
    const MINIMUM_FARE = 1500; // SEK - Minimum charge for combined service

    let totalPrice = BASE_MOVE_FARE + BASE_CLEANING_FARE;

    // Item-based pricing for moving
    if (numberOfItems > 0) {
      totalPrice += numberOfItems * PRICE_PER_ITEM;
    }

    // Person-based pricing (beyond 1 person)
    if (numberOfPersons > 1) {
      totalPrice += (numberOfPersons - 1) * PRICE_PER_PERSON;
    }

    // Time-based pricing for moving
    const moveHours = estimatedHours ? estimatedHours * 0.7 : 1.5; // Assume 70% of time for moving
    totalPrice += moveHours * PRICE_PER_HOUR_MOVE * numberOfPersons;

    // Time-based pricing for cleaning
    const cleaningHours = estimatedHours ? estimatedHours * 0.3 : 1; // Assume 30% of time for cleaning
    totalPrice += cleaningHours * PRICE_PER_HOUR_CLEANING;

    // Cleaning intensity multiplier
    let intensityMultiplier = 1;
    switch (cleaningIntensity) {
      case 'deep':
        intensityMultiplier = 1.5;
        break;
      case 'move_out':
        intensityMultiplier = 2;
        break;
      default: // basic
        intensityMultiplier = 1;
    }
    totalPrice *= intensityMultiplier;

    // Cleaning areas surcharge
    if (cleaningAreas.includes('entire_apartment')) {
      totalPrice *= 1.2; // 20% surcharge for entire apartment
    } else if (cleaningAreas.length > 3) {
      totalPrice *= 1.1; // 10% surcharge for multiple areas
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

    // Cleaning supplies surcharge (if not provided)
    if (!cleaningSupplies) {
      totalPrice += 150; // Supplies cost
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
  static getMoveCleaningPriceBreakdown(
    numberOfItems: number,
    numberOfPersons: number,
    hasElevator: boolean,
    itemCategories: string[],
    cleaningAreas: string[],
    cleaningIntensity: 'basic' | 'deep' | 'move_out',
    cleaningSupplies: boolean,
    estimatedHours?: number,
    scheduledDateTime?: string
  ): {
    baseFare: number;
    itemCost: number;
    personCost: number;
    moveTimeCost: number;
    cleaningTimeCost: number;
    cleaningIntensityCost: number;
    surcharges: number;
    subtotal: number;
    vat: number;
    total: number;
  } {
    const BASE_MOVE_FARE = 800;
    const BASE_CLEANING_FARE = 300;
    const PRICE_PER_ITEM = 25;
    const PRICE_PER_HOUR_MOVE = 450;
    const PRICE_PER_HOUR_CLEANING = 180;
    const PRICE_PER_PERSON = 200;
    const MINIMUM_FARE = 1500;

    let subtotal = BASE_MOVE_FARE + BASE_CLEANING_FARE;

    // Item cost
    const itemCost = numberOfItems * PRICE_PER_ITEM;
    subtotal += itemCost;

    // Person cost
    const personCost = numberOfPersons > 1 ? (numberOfPersons - 1) * PRICE_PER_PERSON : 0;
    subtotal += personCost;

    // Time costs
    const moveHours = estimatedHours ? estimatedHours * 0.7 : 1.5;
    const cleaningHours = estimatedHours ? estimatedHours * 0.3 : 1;
    const moveTimeCost = moveHours * PRICE_PER_HOUR_MOVE * numberOfPersons;
    const cleaningTimeCost = cleaningHours * PRICE_PER_HOUR_CLEANING;
    subtotal += moveTimeCost + cleaningTimeCost;

    // Cleaning intensity cost
    let intensityMultiplier = 1;
    switch (cleaningIntensity) {
      case 'deep':
        intensityMultiplier = 1.5;
        break;
      case 'move_out':
        intensityMultiplier = 2;
        break;
    }
    const baseSubtotalBeforeIntensity = subtotal;
    subtotal *= intensityMultiplier;
    const cleaningIntensityCost = subtotal - baseSubtotalBeforeIntensity;

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

    // Cleaning supplies surcharge
    if (!cleaningSupplies) {
      surcharges += 150;
    }

    // Cleaning areas surcharge
    if (cleaningAreas.includes('entire_apartment')) {
      surcharges += subtotal * 0.2;
    } else if (cleaningAreas.length > 3) {
      surcharges += subtotal * 0.1;
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
      baseFare: BASE_MOVE_FARE + BASE_CLEANING_FARE,
      itemCost: Math.round(itemCost),
      personCost: Math.round(personCost),
      moveTimeCost: Math.round(moveTimeCost),
      cleaningTimeCost: Math.round(cleaningTimeCost),
      cleaningIntensityCost: Math.round(cleaningIntensityCost),
      surcharges: Math.round(surcharges),
      subtotal: Math.round(preVatTotal),
      vat: Math.round(vat),
      total: Math.round(total)
    };
  }

  // Send order confirmation notification
  static async sendOrderConfirmationNotification(userId: string, orderData: MoveCleaningOrderData) {
    try {
      const notificationPayload = {
        title: "Flytt & Städning bokning bekräftad! 🧹📦",
        message: `Din flytt & städning från ${orderData.pickupAddress} till ${orderData.deliveryAddress} är bokad för ${new Date(orderData.scheduledDateTime).toLocaleString('sv-SE')}. Totalt pris: ${orderData.totalPrice} SEK.`,
        subID: userId,
        pushData: {
          orderId: "new-move-cleaning-order", // This would be the actual order ID
          type: "move_cleaning_booking_confirmed",
          paymentMethod: orderData.paymentMethod,
        },
      };

      const result = await nativeNotifyAPI.sendNotification(notificationPayload);
      if (result.success) {
        console.log("Move cleaning order confirmation notification sent successfully");
      } else {
        console.error("Failed to send move cleaning order confirmation notification:", result.error);
      }
    } catch (error) {
      console.error("Error sending move cleaning order confirmation notification:", error);
    }
  }
}