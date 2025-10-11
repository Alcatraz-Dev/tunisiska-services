import { client } from "@/sanityClient";

export interface TaxiOrderData {
  userId: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  pickupAddress: string;
  destinationAddress: string;
  scheduledDateTime: string;
  numberOfPassengers: number;
  isRoundTrip?: boolean;
  returnDateTime?: string;
  estimatedDistance?: number;
  totalPrice: number;
  pointsUsed?: number;
  paymentMethod: 'stripe' | 'points' | 'combined';
  notes?: string;
}

export class TaxiOrderService {
  // Create a new taxi order in Sanity
  static async createTaxiOrder(orderData: TaxiOrderData): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('🚕 Creating taxi order in Sanity:', orderData.customerInfo.name);

      const order = {
        _type: 'taxiOrder',
        userId: orderData.userId,
        serviceType: 'taxi',
        status: 'pending',
        customerInfo: orderData.customerInfo,
        pickupAddress: orderData.pickupAddress,
        destinationAddress: orderData.destinationAddress,
        scheduledDateTime: orderData.scheduledDateTime,
        numberOfPassengers: orderData.numberOfPassengers,
        isRoundTrip: orderData.isRoundTrip || false,
        returnDateTime: orderData.returnDateTime,
        estimatedDistance: orderData.estimatedDistance,
        totalPrice: orderData.totalPrice,
        pointsUsed: orderData.pointsUsed || 0,
        paymentMethod: orderData.paymentMethod,
        notes: orderData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await client.create(order);
      console.log('✅ Taxi order created successfully in Sanity:', result._id);

      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error creating taxi order in Sanity:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Get user's taxi orders
  static async getUserTaxiOrders(userId: string): Promise<{ success: boolean; orders?: any[]; error?: string }> {
    try {
      console.log('🔍 Fetching taxi orders for user:', userId);

      const orders = await client.fetch(
        `*[_type == "taxiOrder" && userId == $userId] | order(createdAt desc)`,
        { userId }
      );

      console.log(`✅ Found ${orders.length} taxi orders for user`);
      return { success: true, orders };
    } catch (error: any) {
      console.error('💥 Error fetching taxi orders:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Get taxi order by ID
  static async getTaxiOrder(orderId: string): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('🔍 Fetching taxi order:', orderId);

      const order = await client.fetch(
        `*[_type == "taxiOrder" && _id == $orderId][0]`,
        { orderId }
      );

      if (order) {
        console.log('✅ Taxi order found');
        return { success: true, order };
      } else {
        console.log('❌ Taxi order not found');
        return { success: false, error: 'Order not found' };
      }
    } catch (error: any) {
      console.error('💥 Error fetching taxi order:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Update taxi order status
  static async updateTaxiOrderStatus(orderId: string, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('🔄 Updating taxi order status:', orderId, status);

      const result = await client
        .patch(orderId)
        .set({
          status,
          updatedAt: new Date().toISOString()
        })
        .commit();

      console.log('✅ Taxi order status updated successfully');
      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error updating taxi order status:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Cancel taxi order
  static async cancelTaxiOrder(orderId: string, reason?: string): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log('❌ Cancelling taxi order:', orderId);

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

      console.log('✅ Taxi order cancelled successfully');
      return { success: true, order: result };
    } catch (error: any) {
      console.error('💥 Error cancelling taxi order:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Calculate taxi price based on distance and Swedish taxi pricing standards
  static calculateTaxiPrice(distance: number, isRoundTrip: boolean = false, scheduledDateTime?: string): number {
    // Swedish taxi pricing based on industry standards
    const BASE_FARE = 45; // SEK - Basic starting fee
    const PRICE_PER_KM = 12; // SEK per kilometer
    const PRICE_PER_MINUTE = 8; // SEK per minute (for time-based billing)
    const MINIMUM_FARE = 85; // SEK - Minimum charge

    // Estimate time based on distance (assuming average speed of 30 km/h in city)
    const estimatedMinutes = Math.max(5, (distance / 30) * 60); // Minimum 5 minutes

    let totalPrice = BASE_FARE;

    // Distance-based pricing
    if (distance > 0) {
      totalPrice += distance * PRICE_PER_KM;
    }

    // Time-based component (minimum charge covers basic time)
    if (estimatedMinutes > 10) {
      totalPrice += (estimatedMinutes - 10) * PRICE_PER_MINUTE;
    }

    // Apply minimum fare
    totalPrice = Math.max(totalPrice, MINIMUM_FARE);

    // Time-based surcharges
    if (scheduledDateTime) {
      const bookingTime = new Date(scheduledDateTime);
      const hour = bookingTime.getHours();

      // Night surcharge (22:00 - 06:00)
      if (hour >= 22 || hour < 6) {
        totalPrice *= 1.3; // 30% night surcharge
      }
      // Peak hours surcharge (07:00 - 09:00, 16:00 - 18:00 on weekdays)
      else if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
        const dayOfWeek = bookingTime.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
          totalPrice *= 1.15; // 15% peak hours surcharge
        }
      }
    }

    // Round trip pricing
    if (isRoundTrip) {
      // Round trip gets 20% discount on return journey
      totalPrice = totalPrice * 1.8; // 2 trips with 20% discount on second
    }

    // Fuel surcharge (approximately 5% based on current fuel prices)
    totalPrice *= 1.05;

    // VAT (25% in Sweden)
    totalPrice *= 1.25;

    return Math.round(totalPrice);
  }

  // Calculate price breakdown for transparency
  static getPriceBreakdown(distance: number, isRoundTrip: boolean = false, scheduledDateTime?: string): {
    baseFare: number;
    distanceCost: number;
    timeCost: number;
    surcharges: number;
    subtotal: number;
    vat: number;
    total: number;
  } {
    const BASE_FARE = 45;
    const PRICE_PER_KM = 12;
    const PRICE_PER_MINUTE = 8;
    const MINIMUM_FARE = 85;

    const estimatedMinutes = Math.max(5, (distance / 30) * 60);
    let subtotal = BASE_FARE;

    // Distance cost
    const distanceCost = distance * PRICE_PER_KM;
    subtotal += distanceCost;

    // Time cost
    const timeCost = estimatedMinutes > 10 ? (estimatedMinutes - 10) * PRICE_PER_MINUTE : 0;
    subtotal += timeCost;

    // Apply minimum fare
    subtotal = Math.max(subtotal, MINIMUM_FARE);

    let surcharges = 0;

    // Time-based surcharges
    if (scheduledDateTime) {
      const bookingTime = new Date(scheduledDateTime);
      const hour = bookingTime.getHours();

      if (hour >= 22 || hour < 6) {
        surcharges += subtotal * 0.3; // Night surcharge
      } else if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
        const dayOfWeek = bookingTime.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          surcharges += subtotal * 0.15; // Peak hours surcharge
        }
      }
    }

    // Round trip
    if (isRoundTrip) {
      surcharges += subtotal * 0.8; // Additional trip with discount
    }

    // Fuel surcharge
    surcharges += subtotal * 0.05;

    const preVatTotal = subtotal + surcharges;
    const vat = preVatTotal * 0.25;
    const total = preVatTotal + vat;

    return {
      baseFare: BASE_FARE,
      distanceCost: Math.round(distanceCost),
      timeCost: Math.round(timeCost),
      surcharges: Math.round(surcharges),
      subtotal: Math.round(preVatTotal),
      vat: Math.round(vat),
      total: Math.round(total)
    };
  }
}