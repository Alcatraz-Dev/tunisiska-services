// Service Ordering API and Business Logic
import {
  ServiceOrder,
  ServiceType,
  OrderStatus,
  ServicePricing,
  ServicePayment,
  MoveServiceOrder,
  TaxiServiceOrder,
  CleaningServiceOrder,
  ShippingServiceOrder,
  CleaningMoveServiceOrder,
  MoveCleaningServiceOrder,
  MoveItemCategory,
  VehicleType,
  CleaningType,
  ShippingSpeed
} from '@/app/schemas/serviceSchemas';

export class OrderService {
  private static baseURL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://192.168.8.106:3000';

  // Create a new service order
  static async createOrder(orderData: Partial<ServiceOrder>): Promise<ServiceOrder> {
    try {
      console.log('🚀 Creating service order:', orderData.serviceType);
      
      const response = await fetch(`${this.baseURL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.status}`);
      }

      const order = await response.json();
      console.log('✅ Order created successfully:', order.id);
      return order;
    } catch (error) {
      console.error('💥 Error creating order:', error);
      throw error;
    }
  }

  // Get user's orders
  static async getUserOrders(userId: string): Promise<ServiceOrder[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/orders/user/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('💥 Error fetching orders:', error);
      throw error;
    }
  }

  // Get order by ID
  static async getOrder(orderId: string): Promise<ServiceOrder> {
    try {
      const response = await fetch(`${this.baseURL}/api/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('💥 Error fetching order:', error);
      throw error;
    }
  }

  // Update order status
  static async updateOrderStatus(orderId: string, status: OrderStatus): Promise<ServiceOrder> {
    try {
      const response = await fetch(`${this.baseURL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update order status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('💥 Error updating order status:', error);
      throw error;
    }
  }

  // Process payment for order
  static async processOrderPayment(paymentData: ServicePayment): Promise<{ success: boolean; paymentIntentId?: string }> {
    try {
      console.log('💳 Processing payment for order:', paymentData.orderId);
      
      const response = await fetch(`${this.baseURL}/api/orders/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error(`Payment processing failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Payment processed successfully');
      return result;
    } catch (error) {
      console.error('💥 Error processing payment:', error);
      throw error;
    }
  }

  // Cancel order
  static async cancelOrder(orderId: string, reason?: string): Promise<ServiceOrder> {
    try {
      const response = await fetch(`${this.baseURL}/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel order: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('💥 Error cancelling order:', error);
      throw error;
    }
  }
}

// Pricing Calculator
export class PricingService {
  private static servicePricing: Record<ServiceType, ServicePricing> = {
    [ServiceType.MOVE]: {
      serviceType: ServiceType.MOVE,
      basePrice: 800, // SEK
      pricePerHour: 450,
      pricePerItem: 25,
      modifiers: [
        { name: 'No Elevator', type: 'fixed', value: 200 },
        { name: 'Heavy Items', type: 'percentage', value: 15 },
        { name: 'Weekend', type: 'percentage', value: 20 },
      ]
    },
    [ServiceType.TAXI]: {
      serviceType: ServiceType.TAXI,
      basePrice: 50, // SEK
      pricePerKm: 12,
      modifiers: [
        { name: 'Premium Vehicle', type: 'percentage', value: 50 },
        { name: 'Van', type: 'percentage', value: 30 },
        { name: 'Night Hours', type: 'percentage', value: 25 },
      ]
    },
    [ServiceType.CLEANING]: {
      serviceType: ServiceType.CLEANING,
      basePrice: 400, // SEK
      pricePerHour: 350,
      pricePerRoom: 150,
      modifiers: [
        { name: 'Deep Clean', type: 'percentage', value: 40 },
        { name: 'Move In/Out', type: 'percentage', value: 30 },
        { name: 'Post Construction', type: 'percentage', value: 60 },
      ]
    },
    [ServiceType.SHIPPING]: {
      serviceType: ServiceType.SHIPPING,
      basePrice: 80, // SEK
      pricePerKm: 8,
      modifiers: [
        { name: 'Express Delivery', type: 'percentage', value: 50 },
        { name: 'Overnight', type: 'percentage', value: 100 },
        { name: 'Fragile', type: 'fixed', value: 50 },
        { name: 'Insurance', type: 'percentage', value: 5 },
      ]
    },
    [ServiceType.CLEANING_MOVE]: {
      serviceType: ServiceType.CLEANING_MOVE,
      basePrice: 1200, // SEK
      pricePerHour: 500,
      pricePerItem: 30,
      modifiers: [
        { name: 'Both Locations', type: 'percentage', value: 80 },
        { name: 'Deep Clean', type: 'percentage', value: 25 },
        { name: 'No Elevator', type: 'fixed', value: 300 },
      ]
    },
    [ServiceType.MOVE_CLEANING]: {
      serviceType: ServiceType.MOVE_CLEANING,
      basePrice: 1500, // SEK
      pricePerHour: 500,
      pricePerItem: 30,
      modifiers: [
        { name: 'No Elevator', type: 'fixed', value: 200 },
        { name: 'Heavy Items', type: 'percentage', value: 15 },
        { name: 'Deep Clean', type: 'percentage', value: 25 },
        { name: 'Move Out Clean', type: 'percentage', value: 50 },
        { name: 'Weekend', type: 'percentage', value: 20 },
      ]
    }
  };

  static calculatePrice(orderData: Partial<ServiceOrder>): number {
    const pricing = this.servicePricing[orderData.serviceType!];
    if (!pricing) {
      throw new Error(`Pricing not found for service type: ${orderData.serviceType}`);
    }

    let totalPrice = pricing.basePrice;

    // Service-specific calculations
    switch (orderData.serviceType) {
      case ServiceType.MOVE:
        totalPrice += this.calculateMovePrice(orderData as Partial<MoveServiceOrder>, pricing);
        break;
      case ServiceType.TAXI:
        totalPrice += this.calculateTaxiPrice(orderData as Partial<TaxiServiceOrder>, pricing);
        break;
      case ServiceType.CLEANING:
        totalPrice += this.calculateCleaningPrice(orderData as Partial<CleaningServiceOrder>, pricing);
        break;
      case ServiceType.SHIPPING:
        totalPrice += this.calculateShippingPrice(orderData as Partial<ShippingServiceOrder>, pricing);
        break;
      case ServiceType.CLEANING_MOVE:
        totalPrice += this.calculateCleaningMovePrice(orderData as Partial<CleaningMoveServiceOrder>, pricing);
        break;
      case ServiceType.MOVE_CLEANING:
        totalPrice += this.calculateMoveCleaningPrice(orderData as Partial<MoveCleaningServiceOrder>, pricing);
        break;
    }

    // Apply modifiers
    const modifierPrice = this.calculateModifiers(orderData, pricing);
    totalPrice += modifierPrice;

    return Math.round(totalPrice);
  }

  private static calculateMovePrice(order: Partial<MoveServiceOrder>, pricing: ServicePricing): number {
    let price = 0;
    
    if (order.numberOfItems && pricing.pricePerItem) {
      price += order.numberOfItems * pricing.pricePerItem;
    }

    if (order.estimatedHours && pricing.pricePerHour) {
      price += order.estimatedHours * pricing.pricePerHour;
    }

    return price;
  }

  private static calculateTaxiPrice(order: Partial<TaxiServiceOrder>, pricing: ServicePricing): number {
    let price = 0;
    
    if (order.estimatedDistance && pricing.pricePerKm) {
      price += order.estimatedDistance * pricing.pricePerKm;
    }

    return price;
  }

  private static calculateCleaningPrice(order: Partial<CleaningServiceOrder>, pricing: ServicePricing): number {
    let price = 0;
    
    if (order.numberOfRooms && pricing.pricePerRoom) {
      price += order.numberOfRooms * pricing.pricePerRoom;
    }

    return price;
  }

  private static calculateShippingPrice(order: Partial<ShippingServiceOrder>, pricing: ServicePricing): number {
    let price = 0;
    
    // Add weight-based pricing if needed
    if (order.packageDetails?.weight) {
      price += order.packageDetails.weight * 5; // 5 SEK per kg
    }

    return price;
  }

  private static calculateCleaningMovePrice(order: Partial<CleaningMoveServiceOrder>, pricing: ServicePricing): number {
    let price = 0;

    if (order.numberOfItems && pricing.pricePerItem) {
      price += order.numberOfItems * pricing.pricePerItem;
    }

    if (order.estimatedHours && pricing.pricePerHour) {
      price += order.estimatedHours * pricing.pricePerHour;
    }

    return price;
  }

  private static calculateMoveCleaningPrice(order: Partial<MoveCleaningServiceOrder>, pricing: ServicePricing): number {
    let price = 0;

    if (order.numberOfItems && pricing.pricePerItem) {
      price += order.numberOfItems * pricing.pricePerItem;
    }

    if (order.estimatedHours && pricing.pricePerHour) {
      price += order.estimatedHours * pricing.pricePerHour;
    }

    return price;
  }

  private static calculateModifiers(order: Partial<ServiceOrder>, pricing: ServicePricing): number {
    let modifierPrice = 0;
    const basePrice = pricing.basePrice;

    // Apply relevant modifiers based on order details
    pricing.modifiers.forEach(modifier => {
      let shouldApply = false;

      // Check if modifier should be applied based on order data
      switch (modifier.name) {
        case 'No Elevator':
          shouldApply = (order as any).hasElevator === false;
          break;
        case 'Heavy Items':
          shouldApply = (order as any).itemCategories?.includes(MoveItemCategory.HEAVY_ITEMS);
          break;
        case 'Premium Vehicle':
          shouldApply = (order as any).vehicleType === VehicleType.PREMIUM;
          break;
        case 'Van':
          shouldApply = (order as any).vehicleType === VehicleType.VAN;
          break;
        case 'Deep Clean':
          shouldApply = (order as any).cleaningType === CleaningType.DEEP_CLEAN;
          break;
        case 'Express Delivery':
          shouldApply = (order as any).shippingSpeed === ShippingSpeed.EXPRESS;
          break;
        case 'Overnight':
          shouldApply = (order as any).shippingSpeed === ShippingSpeed.OVERNIGHT;
          break;
        // Add more conditions as needed
      }

      if (shouldApply) {
        if (modifier.type === 'fixed') {
          modifierPrice += modifier.value;
        } else if (modifier.type === 'percentage') {
          modifierPrice += (basePrice * modifier.value) / 100;
        }
      }
    });

    return modifierPrice;
  }

  static getServicePricing(serviceType: ServiceType): ServicePricing {
    return this.servicePricing[serviceType];
  }
}

// Order Validation
export class OrderValidator {
  static validateOrder(order: Partial<ServiceOrder>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Common validations
    if (!order.serviceType) {
      errors.push('Service type is required');
    }

    if (!order.customerInfo?.name) {
      errors.push('Customer name is required');
    }

    if (!order.customerInfo?.phone) {
      errors.push('Customer phone is required');
    }

    if (!order.scheduledDateTime) {
      errors.push('Scheduled date and time is required');
    }

    // Service-specific validations
    switch (order.serviceType) {
      case ServiceType.MOVE:
        this.validateMoveOrder(order as Partial<MoveServiceOrder>, errors);
        break;
      case ServiceType.TAXI:
        this.validateTaxiOrder(order as Partial<TaxiServiceOrder>, errors);
        break;
      case ServiceType.CLEANING:
        this.validateCleaningOrder(order as Partial<CleaningServiceOrder>, errors);
        break;
      case ServiceType.SHIPPING:
        this.validateShippingOrder(order as Partial<ShippingServiceOrder>, errors);
        break;
      case ServiceType.CLEANING_MOVE:
        this.validateCleaningMoveOrder(order as Partial<CleaningMoveServiceOrder>, errors);
        break;
      case ServiceType.MOVE_CLEANING:
        this.validateMoveCleaningOrder(order as Partial<MoveCleaningServiceOrder>, errors);
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validateMoveOrder(order: Partial<MoveServiceOrder>, errors: string[]) {
    if (!order.pickupAddress) {
      errors.push('Pickup address is required');
    }

    if (!order.deliveryAddress) {
      errors.push('Delivery address is required');
    }

    if (!order.numberOfItems || order.numberOfItems <= 0) {
      errors.push('Number of items must be greater than 0');
    }

    if (!order.numberOfPersons || order.numberOfPersons <= 0) {
      errors.push('Number of persons must be greater than 0');
    }
  }

  private static validateTaxiOrder(order: Partial<TaxiServiceOrder>, errors: string[]) {
    if (!order.pickupAddress) {
      errors.push('Pickup address is required');
    }

    if (!order.destinationAddress) {
      errors.push('Destination address is required');
    }

    if (!order.numberOfPassengers || order.numberOfPassengers <= 0) {
      errors.push('Number of passengers must be greater than 0');
    }

    if (!order.vehicleType) {
      errors.push('Vehicle type is required');
    }
  }

  private static validateCleaningOrder(order: Partial<CleaningServiceOrder>, errors: string[]) {
    if (!order.address) {
      errors.push('Address is required');
    }

    if (!order.propertyType) {
      errors.push('Property type is required');
    }

    if (!order.cleaningType) {
      errors.push('Cleaning type is required');
    }

    if (!order.numberOfRooms || order.numberOfRooms <= 0) {
      errors.push('Number of rooms must be greater than 0');
    }
  }

  private static validateShippingOrder(order: Partial<ShippingServiceOrder>, errors: string[]) {
    if (!order.pickupAddress) {
      errors.push('Pickup address is required');
    }

    if (!order.deliveryAddress) {
      errors.push('Delivery address is required');
    }

    if (!order.packageDetails) {
      errors.push('Package details are required');
    } else {
      if (!order.packageDetails.weight || order.packageDetails.weight <= 0) {
        errors.push('Package weight must be greater than 0');
      }

      if (!order.packageDetails.description) {
        errors.push('Package description is required');
      }
    }
  }

  private static validateCleaningMoveOrder(order: Partial<CleaningMoveServiceOrder>, errors: string[]) {
    // Validate move aspects
    if (!order.pickupAddress) {
      errors.push('Pickup address is required');
    }

    if (!order.deliveryAddress) {
      errors.push('Delivery address is required');
    }

    if (!order.numberOfItems || order.numberOfItems <= 0) {
      errors.push('Number of items must be greater than 0');
    }

    // Validate cleaning aspects
    if (!order.cleaningType) {
      errors.push('Cleaning type is required');
    }
  }

  private static validateMoveCleaningOrder(order: Partial<MoveCleaningServiceOrder>, errors: string[]) {
    // Validate move aspects
    if (!order.pickupAddress) {
      errors.push('Pickup address is required');
    }

    if (!order.deliveryAddress) {
      errors.push('Delivery address is required');
    }

    if (!order.numberOfItems || order.numberOfItems <= 0) {
      errors.push('Number of items must be greater than 0');
    }

    if (!order.numberOfPersons || order.numberOfPersons <= 0) {
      errors.push('Number of persons must be greater than 0');
    }

    // Validate cleaning aspects
    if (!order.cleaningAreas || order.cleaningAreas.length === 0) {
      errors.push('Cleaning areas are required');
    }

    if (!order.cleaningIntensity) {
      errors.push('Cleaning intensity is required');
    }
  }
}

export default {
  OrderService,
  PricingService,
  OrderValidator
};