// Service Order Schemas and Types
// This file defines the data structures for the service ordering system

export interface ServiceBase {
  id: string;
  userId: string; // Clerk user ID
  serviceType: ServiceType;
  status: OrderStatus;
  customerInfo: CustomerInfo;
  scheduledDateTime: string; // ISO string
  totalPrice: number;
  pointsUsed?: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export enum ServiceType {
  MOVE = 'move',
  TAXI = 'taxi', 
  CLEANING = 'cleaning',
  SHIPPING = 'shipping',
  CLEANING_MOVE = 'cleaning-move'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  STRIPE = 'stripe',
  POINTS = 'points',
  COMBINED = 'combined' // Points + Stripe
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
}

// Move Service Schema
export interface MoveServiceOrder extends ServiceBase {
  serviceType: ServiceType.MOVE;
  pickupAddress: string;
  deliveryAddress: string;
  itemCategories: MoveItemCategory[];
  numberOfItems: number;
  numberOfPersons: number;
  hasElevator: boolean;
  specialRequirements?: string;
  estimatedHours?: number;
}

export enum MoveItemCategory {
  FURNITURE = 'furniture',
  ELECTRONICS = 'electronics',
  BOXES = 'boxes',
  CLOTHING = 'clothing',
  FRAGILE = 'fragile',
  HEAVY_ITEMS = 'heavy_items',
  APPLIANCES = 'appliances'
}

// Taxi Service Schema
export interface TaxiServiceOrder extends ServiceBase {
  serviceType: ServiceType.TAXI;
  pickupAddress: string;
  destinationAddress: string;
  numberOfPassengers: number;
  vehicleType: VehicleType;
  isRoundTrip: boolean;
  returnDateTime?: string;
  estimatedDistance?: number;
}

export enum VehicleType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  VAN = 'van',
  WHEELCHAIR_ACCESSIBLE = 'wheelchair_accessible'
}

// Cleaning Service Schema
export interface CleaningServiceOrder extends ServiceBase {
  serviceType: ServiceType.CLEANING;
  address: string;
  propertyType: PropertyType;
  cleaningType: CleaningType;
  numberOfRooms: number;
  squareMeters?: number;
  frequency: CleaningFrequency;
  specialInstructions?: string;
  suppliesProvided: boolean;
}

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  OFFICE = 'office',
  COMMERCIAL = 'commercial'
}

export enum CleaningType {
  REGULAR = 'regular',
  DEEP_CLEAN = 'deep_clean',
  MOVE_IN_OUT = 'move_in_out',
  POST_CONSTRUCTION = 'post_construction'
}

export enum CleaningFrequency {
  ONE_TIME = 'one_time',
  WEEKLY = 'weekly',
  BI_WEEKLY = 'bi_weekly',
  MONTHLY = 'monthly'
}

// Shipping Service Schema
export interface ShippingServiceOrder extends ServiceBase {
  serviceType: ServiceType.SHIPPING;
  pickupAddress: string;
  deliveryAddress: string;
  packageDetails: PackageDetails;
  shippingSpeed: ShippingSpeed;
  requiresSignature: boolean;
  insuranceValue?: number;
  trackingNumber?: string;
}

export interface PackageDetails {
  weight: number; // in kg
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  description: string;
  value: number;
  isFragile: boolean;
}

export enum ShippingSpeed {
  STANDARD = 'standard', // 3-5 days
  EXPRESS = 'express',   // 1-2 days
  OVERNIGHT = 'overnight' // Next day
}

// Cleaning + Move Service Schema  
export interface CleaningMoveServiceOrder extends ServiceBase {
  serviceType: ServiceType.CLEANING_MOVE;
  // Move details
  pickupAddress: string;
  deliveryAddress: string;
  itemCategories: MoveItemCategory[];
  numberOfItems: number;
  hasElevator: boolean;
  // Cleaning details
  cleaningType: CleaningType;
  cleanBothLocations: boolean;
  cleaningInstructions?: string;
  estimatedHours?: number;
}

// Service Pricing Schema
export interface ServicePricing {
  serviceType: ServiceType;
  basePrice: number;
  pricePerHour?: number;
  pricePerKm?: number;
  pricePerItem?: number;
  pricePerRoom?: number;
  modifiers: PriceModifier[];
}

export interface PriceModifier {
  name: string;
  type: 'fixed' | 'percentage' | 'per_unit';
  value: number;
  condition?: string;
}

// Union type for all service orders
export type ServiceOrder = 
  | MoveServiceOrder 
  | TaxiServiceOrder 
  | CleaningServiceOrder 
  | ShippingServiceOrder 
  | CleaningMoveServiceOrder;

// Order tracking and notifications
export interface OrderUpdate {
  orderId: string;
  status: OrderStatus;
  message: string;
  timestamp: string;
  location?: string;
  estimatedCompletion?: string;
}

// Payment integration
export interface ServicePayment {
  orderId: string;
  amount: number;
  pointsUsed: number;
  stripeAmount: number; // amount - (pointsUsed * pointValue)
  paymentIntentId?: string;
  status: 'pending' | 'completed' | 'failed';
}

// Service availability
export interface ServiceAvailability {
  serviceType: ServiceType;
  area: string;
  isAvailable: boolean;
  estimatedResponse: string; // "30 minutes", "2 hours", etc.
  priceRange: {
    min: number;
    max: number;
  };
}

// Footer Schema
export interface FooterLink {
  label: string;
  url: string;
}

export interface SocialMediaLink {
  platform: string;
  url: string;
}

export interface Footer {
  _id: string;
  _type: 'footer';
  links: FooterLink[];
  socialMedia: SocialMediaLink[];
  copyright: string;
}

export default {
  ServiceType,
  OrderStatus,
  PaymentMethod,
  MoveItemCategory,
  VehicleType,
  PropertyType,
  CleaningType,
  CleaningFrequency,
  ShippingSpeed
};