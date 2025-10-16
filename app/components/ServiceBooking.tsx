import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { AutoText } from './ui/AutoText';
import Input from './ui/Input';
// Payment component removed - Stripe dependency eliminated
import { showAlert } from '@/app/utils/showAlert';
import { useTheme } from '@/app/context/ThemeContext';
import { 
  ServiceType, 
  ServiceOrder, 
  OrderStatus,
  PaymentMethod,
  MoveServiceOrder,
  TaxiServiceOrder,
  CleaningServiceOrder,
  ShippingServiceOrder,
  CleaningMoveServiceOrder
} from '@/app/schemas/serviceSchemas';
import { OrderService, PricingService, OrderValidator } from '@/app/services/orderService';

interface ServiceBookingProps {
  serviceType: ServiceType;
  onOrderCreated: (order: ServiceOrder) => void;
  onBack: () => void;
}

export default function ServiceBooking({ serviceType, onOrderCreated, onBack }: ServiceBookingProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { user } = useUser();

  // Common order fields
  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState(user?.primaryEmailAddress?.emailAddress || '');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Service-specific fields
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [numberOfItems, setNumberOfItems] = useState('1');
  const [numberOfPersons, setNumberOfPersons] = useState('1');
  const [hasElevator, setHasElevator] = useState(true);

  // Pricing and payment
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.STRIPE);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    // Load user points
    if (user?.unsafeMetadata) {
      const metadata = user.unsafeMetadata as { points?: number };
      setUserPoints(metadata.points || 0);
    }
  }, [user]);

  useEffect(() => {
    // Calculate price when form data changes
    calculatePrice();
  }, [pickupAddress, deliveryAddress, numberOfItems, numberOfPersons, hasElevator]);

  const calculatePrice = () => {
    try {
      const orderData: Partial<ServiceOrder> = {
        serviceType,
        pickupAddress,
        deliveryAddress,
        numberOfItems: parseInt(numberOfItems) || 1,
        numberOfPersons: parseInt(numberOfPersons) || 1,
        hasElevator,
      } as any;

      const price = PricingService.calculatePrice(orderData);
      setEstimatedPrice(price);
    } catch (error) {
      console.error('Error calculating price:', error);
    }
  };

  const handlePointsChange = (points: string) => {
    const pointsNum = parseInt(points) || 0;
    const maxPoints = Math.min(userPoints, estimatedPrice * 10); // Assuming 1 SEK = 10 points
    setPointsToUse(Math.min(pointsNum, maxPoints));
  };

  const getFinalPrice = () => {
    const pointsValue = pointsToUse / 10; // Convert points to SEK
    return Math.max(0, estimatedPrice - pointsValue);
  };

  const createOrder = async () => {
    try {
      setIsLoading(true);

      // Build order data based on service type
      const baseOrderData = {
        serviceType,
        userId: user?.id!,
        customerInfo: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
        },
        scheduledDateTime: new Date(
          scheduledDate.getFullYear(),
          scheduledDate.getMonth(),
          scheduledDate.getDate(),
          scheduledTime.getHours(),
          scheduledTime.getMinutes()
        ).toISOString(),
        totalPrice: estimatedPrice,
        pointsUsed: pointsToUse,
        paymentMethod,
        status: OrderStatus.PENDING,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let orderData: Partial<ServiceOrder>;

      switch (serviceType) {
        case ServiceType.MOVE:
          orderData = {
            ...baseOrderData,
            pickupAddress,
            deliveryAddress,
            itemCategories: [], // You can add category selection
            numberOfItems: parseInt(numberOfItems),
            numberOfPersons: parseInt(numberOfPersons),
            hasElevator,
            estimatedHours: Math.ceil(parseInt(numberOfItems) / 10), // Rough estimate
          } as Partial<MoveServiceOrder>;
          break;

        case ServiceType.TAXI:
          orderData = {
            ...baseOrderData,
            pickupAddress,
            destinationAddress: deliveryAddress,
            numberOfPassengers: parseInt(numberOfPersons),
            vehicleType: 'standard', // You can add vehicle selection
            isRoundTrip: false,
            estimatedDistance: 10, // You can add distance calculation
          } as Partial<TaxiServiceOrder>;
          break;

        case ServiceType.CLEANING:
          orderData = {
            ...baseOrderData,
            address: pickupAddress,
            propertyType: 'apartment', // You can add property type selection
            cleaningType: 'regular',
            numberOfRooms: parseInt(numberOfItems),
            frequency: 'one_time',
            suppliesProvided: false,
          } as Partial<CleaningServiceOrder>;
          break;

        case ServiceType.SHIPPING:
          orderData = {
            ...baseOrderData,
            pickupAddress,
            deliveryAddress,
            packageDetails: {
              weight: 1,
              dimensions: { length: 10, width: 10, height: 10 },
              description: notes || 'Package',
              value: 100,
              isFragile: false,
            },
            shippingSpeed: 'standard',
            requiresSignature: false,
          } as Partial<ShippingServiceOrder>;
          break;

        case ServiceType.CLEANING_MOVE:
          orderData = {
            ...baseOrderData,
            pickupAddress,
            deliveryAddress,
            itemCategories: [],
            numberOfItems: parseInt(numberOfItems),
            hasElevator,
            cleaningType: 'regular',
            cleanBothLocations: false,
            estimatedHours: Math.ceil(parseInt(numberOfItems) / 8),
          } as Partial<CleaningMoveServiceOrder>;
          break;

        default:
          throw new Error(`Unsupported service type: ${serviceType}`);
      }

      // Validate order
      const validation = OrderValidator.validateOrder(orderData);
      if (!validation.isValid) {
        showAlert('Fel i formuläret', validation.errors.join('\\n'));
        return;
      }

      // Create order
      const createdOrder = await OrderService.createOrder(orderData);
      
      // Show payment if needed
      const finalPrice = getFinalPrice();
      if (finalPrice > 0) {
        setShowPayment(true);
      } else {
        // Order paid with points only
        await handleOrderComplete(createdOrder);
      }

    } catch (error: any) {
      console.error('Error creating order:', error);
      showAlert('Fel', error.message || 'Kunde inte skapa beställningen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderComplete = async (order: ServiceOrder) => {
    // Deduct points from user if used
    if (pointsToUse > 0) {
      // Update user points (you'll need to implement this)
      // await updateUserPoints(user.id, -pointsToUse);
    }

    showAlert(
      'Beställning skapad! 🎉',
      `Din ${getServiceDisplayName(serviceType)} har beställts.\\n\\nBeställningsnummer: ${order.id}\\nTotalt: ${estimatedPrice} SEK\\nPoäng använda: ${pointsToUse}`
    );

    onOrderCreated(order);
  };

  const getServiceDisplayName = (type: ServiceType): string => {
    switch (type) {
      case ServiceType.MOVE: return 'flytt';
      case ServiceType.TAXI: return 'taxi';
      case ServiceType.CLEANING: return 'städning';
      case ServiceType.SHIPPING: return 'frakt';
      case ServiceType.CLEANING_MOVE: return 'flytt och städning';
      default: return 'tjänst';
    }
  };

  const renderServiceSpecificFields = () => {
    const commonFields = (
      <>
        <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Avhämtningsadress *
        </AutoText>
        <Input
          placeholder="Ex: Storgatan 1, Stockholm"
          value={pickupAddress}
          onChangeText={setPickupAddress}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? 'bg-dark-card text-white' : 'bg-light-card text-black'
          }`}
        />

        <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Destination *
        </AutoText>
        <Input
          placeholder="Ex: Vasagatan 10, Uppsala"
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
          className={`border rounded-lg p-4 mb-4 ${
            isDark ? 'bg-dark-card text-white' : 'bg-light-card text-black'
          }`}
        />
      </>
    );

    switch (serviceType) {
      case ServiceType.MOVE:
        return (
          <>
            {commonFields}
            <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Antal föremål *
            </AutoText>
            <Input
              placeholder="Ex: 20"
              keyboardType="numeric"
              value={numberOfItems}
              onChangeText={setNumberOfItems}
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? 'bg-dark-card text-white' : 'bg-light-card text-black'
              }`}
            />

            <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Antal personer *
            </AutoText>
            <Input
              placeholder="Ex: 2"
              keyboardType="numeric"
              value={numberOfPersons}
              onChangeText={setNumberOfPersons}
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? 'bg-dark-card text-white' : 'bg-light-card text-black'
              }`}
            />

            <View className="flex-row items-center justify-between mb-4 mx-3">
              <AutoText className={isDark ? 'text-white' : 'text-gray-900'}>
                Hiss tillgänglig?
              </AutoText>
              <TouchableOpacity
                className={`px-4 py-2 rounded-lg ${
                  hasElevator ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                onPress={() => setHasElevator(!hasElevator)}
              >
                <AutoText className={hasElevator ? 'text-white' : 'text-black'}>
                  {hasElevator ? 'Ja' : 'Nej'}
                </AutoText>
              </TouchableOpacity>
            </View>
          </>
        );

      case ServiceType.TAXI:
        return (
          <>
            {commonFields}
            <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Antal passagerare *
            </AutoText>
            <Input
              placeholder="Ex: 3"
              keyboardType="numeric"
              value={numberOfPersons}
              onChangeText={setNumberOfPersons}
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? 'bg-dark-card text-white' : 'bg-light-card text-black'
              }`}
            />
          </>
        );

      case ServiceType.CLEANING:
        return (
          <>
            <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Adress *
            </AutoText>
            <Input
              placeholder="Ex: Storgatan 1, Stockholm"
              value={pickupAddress}
              onChangeText={setPickupAddress}
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? 'bg-dark-card text-white' : 'bg-light-card text-black'
              }`}
            />

            <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Antal rum *
            </AutoText>
            <Input
              placeholder="Ex: 3"
              keyboardType="numeric"
              value={numberOfItems}
              onChangeText={setNumberOfItems}
              className={`border rounded-lg p-4 mb-4 ${
                isDark ? 'bg-dark-card text-white' : 'bg-light-card text-black'
              }`}
            />
          </>
        );

      case ServiceType.SHIPPING:
      case ServiceType.CLEANING_MOVE:
        return commonFields;

      default:
        return commonFields;
    }
  };

  if (showPayment) {
    const finalPrice = getFinalPrice();
    return (
      <View className="flex-1">
        <AutoText className={`text-center text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-black'}`}>
          Slutför betalning
        </AutoText>
        <TouchableOpacity
          className={`p-4 rounded-xl items-center ${isDark ? 'bg-blue-500' : 'bg-blue-600'}`}
          onPress={() => {
            // Simulate successful payment
            setShowPayment(false);
            // You might want to complete the order here
          }}
        >
          <AutoText className="text-white font-semibold">
            Bekräfta betalning ({finalPrice} SEK)
          </AutoText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowPayment(false)}
          className="mt-4 p-4 bg-gray-500 rounded-xl items-center"
        >
          <AutoText className="text-white font-semibold">Tillbaka</AutoText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 p-6">
      {/* Header */}
      <View className="flex-row items-center justify-center mb-6 relative">
        <TouchableOpacity onPress={onBack} className="absolute left-0 p-2">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <AutoText className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Boka {getServiceDisplayName(serviceType)}
        </AutoText>
      </View>

      {/* Customer Information */}
      <AutoText className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Kontaktuppgifter
      </AutoText>

      <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Namn *
      </AutoText>
      <Input
        placeholder="Ditt namn"
        value={customerName}
        onChangeText={setCustomerName}
        className={`border rounded-lg p-4 mb-4 ${
          isDark ? 'bg-dark-card text-white' : 'bg-light-card text-black'
        }`}
      />

      <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Telefonnummer *
      </AutoText>
      <Input
        placeholder="070-123 45 67"
        keyboardType="phone-pad"
        value={customerPhone}
        onChangeText={setCustomerPhone}
        className={`border rounded-lg p-4 mb-4 ${
          isDark ? 'bg-dark-card text-white' : 'bg-light-card text-black'
        }`}
      />

      {/* Service-specific fields */}
      <AutoText className={`text-lg font-bold mb-4 mt-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Tjänstedetaljer
      </AutoText>
      
      {renderServiceSpecificFields()}

      {/* Date & Time */}
      <AutoText className={`text-lg font-bold mb-4 mt-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Datum och tid
      </AutoText>

      <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Välj datum *
      </AutoText>
      <TouchableOpacity
        className={`border rounded-lg p-4 mb-4 ${
          isDark ? 'bg-dark-card' : 'bg-light-card'
        }`}
        onPress={() => setShowDatePicker(!showDatePicker)}
      >
        <AutoText className={isDark ? 'text-white' : 'text-gray-900'}>
          {scheduledDate.toLocaleDateString('sv-SE')}
        </AutoText>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={scheduledDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setScheduledDate(selectedDate);
          }}
        />
      )}

      <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Välj tid *
      </AutoText>
      <TouchableOpacity
        className={`border rounded-lg p-4 mb-4 ${
          isDark ? 'bg-dark-card' : 'bg-light-card'
        }`}
        onPress={() => setShowTimePicker(!showTimePicker)}
      >
        <AutoText className={isDark ? 'text-white' : 'text-gray-900'}>
          {scheduledTime.toLocaleTimeString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </AutoText>
      </TouchableOpacity>
      {showTimePicker && (
        <DateTimePicker
          value={scheduledTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) setScheduledTime(selectedTime);
          }}
        />
      )}

      {/* Notes */}
      <AutoText className={`my-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        Extra information
      </AutoText>
      <Input
        placeholder="Särskilda önskemål eller instruktioner..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        className={`border rounded-lg p-4 mb-6 ${
          isDark ? 'bg-dark-card text-white' : 'bg-light-card text-black'
        }`}
      />

      {/* Price Summary */}
      <View className={`border rounded-lg p-4 mb-6 ${isDark ? 'bg-dark-card' : 'bg-light-card'}`}>
        <AutoText className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Prissammanfattning
        </AutoText>
        <View className="flex-row justify-between mb-2">
          <AutoText className={isDark ? 'text-gray-400' : 'text-gray-600'}>Grundpris:</AutoText>
          <AutoText className={isDark ? 'text-white' : 'text-black'}>{estimatedPrice} SEK</AutoText>
        </View>
        {userPoints > 0 && (
          <>
            <View className="flex-row justify-between items-center mb-2">
              <AutoText className={isDark ? 'text-gray-400' : 'text-gray-600'}>Använd poäng:</AutoText>
              <Input
                placeholder="0"
                keyboardType="numeric"
                value={pointsToUse.toString()}
                onChangeText={handlePointsChange}
                className={`border rounded p-2 w-20 text-center ${
                  isDark ? 'bg-gray-700 text-white' : 'bg-white text-black'
                }`}
              />
            </View>
            <AutoText className={`text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Du har {userPoints} poäng tillgängliga
            </AutoText>
            {pointsToUse > 0 && (
              <View className="flex-row justify-between mb-2">
                <AutoText className={isDark ? 'text-gray-400' : 'text-gray-600'}>Poängrabatt:</AutoText>
                <AutoText className="text-green-500">-{(pointsToUse / 10).toFixed(0)} SEK</AutoText>
              </View>
            )}
          </>
        )}
        <View className="border-t border-gray-300 pt-2 mt-2">
          <View className="flex-row justify-between">
            <AutoText className={`font-bold ${isDark ? 'text-white' : 'text-black'}`}>Att betala:</AutoText>
            <AutoText className={`font-bold ${isDark ? 'text-white' : 'text-black'}`}>
              {getFinalPrice()} SEK
            </AutoText>
          </View>
        </View>
      </View>

      {/* Confirm Booking */}
      <TouchableOpacity
        className={`p-4 rounded-xl items-center mb-8 ${
          isLoading ? 'bg-gray-400' : 'bg-blue-500'
        }`}
        onPress={createOrder}
        disabled={isLoading}
      >
        <AutoText className="text-white font-semibold">
          {isLoading ? 'Skapar beställning...' : 'Bekräfta bokning'}
        </AutoText>
      </TouchableOpacity>
    </ScrollView>
  );
}