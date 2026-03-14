import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Share,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AutoText } from './ui/AutoText';
import { showAlert } from '@/app/utils/showAlert';
import { useTheme } from '@/app/context/ThemeContext';
import {
  ServiceOrder,
  ServiceType,
  OrderStatus
} from '@/app/schemas/serviceSchemas';
import { OrderService } from '@/app/services/orderService';

interface OrderManagerProps {
  onBack: () => void;
}

export default function OrderManager({ onBack }: OrderManagerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { user } = useUser();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      if (!user?.id) return;
      
      const userOrders = await OrderService.getUserOrders(user.id);
      setOrders(userOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error: any) {
      console.error('Error loading orders:', error);
      showAlert('Fel', 'Kunde inte ladda beställningar');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await OrderService.cancelOrder(orderId, 'Cancelled by user');
      showAlert('Beställning avbruten', 'Din beställning har avbrutits');
      loadOrders(); // Reload orders
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      showAlert('Fel', 'Kunde inte avbryta beställningen');
    }
  };

  const getServiceIcon = (serviceType: ServiceType): keyof typeof Ionicons.glyphMap => {
    switch (serviceType) {
      case ServiceType.MOVE: return 'home-outline';
      case ServiceType.TAXI: return 'car-outline';
      case ServiceType.CLEANING: return 'sparkles-outline';
      case ServiceType.SHIPPING: return 'cube-outline';
      case ServiceType.CONTAINER_SHIPPING: return 'boat-outline';
      case ServiceType.CLEANING_MOVE: return 'construct-outline';
      case ServiceType.MOVE_CLEANING: return 'construct-outline';
      default: return 'briefcase-outline';
    }
  };

  const getServiceDisplayName = (serviceType: ServiceType): string => {
    switch (serviceType) {
      case ServiceType.MOVE: return 'Flytt';
      case ServiceType.TAXI: return 'Taxi';
      case ServiceType.CLEANING: return 'Städning';
      case ServiceType.SHIPPING: return 'Shipping Sweden & Tunisia';
      case ServiceType.CONTAINER_SHIPPING: return 'Container Shipping';
      case ServiceType.CLEANING_MOVE: return 'Flytt & Städning';
      case ServiceType.MOVE_CLEANING: return 'Flytt och städning hjälp';
      default: return 'Service';
    }
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.PENDING: return '#f59e0b';
      case OrderStatus.CONFIRMED: return '#3b82f6';
      case OrderStatus.IN_PROGRESS: return '#8b5cf6';
      case OrderStatus.COMPLETED: return '#10b981';
      case OrderStatus.CANCELLED: return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusDisplayName = (status: OrderStatus): string => {
    switch (status) {
      case OrderStatus.PENDING: return 'Väntar';
      case OrderStatus.CONFIRMED: return 'Bekräftad';
      case OrderStatus.IN_PROGRESS: return 'Pågår';
      case OrderStatus.COMPLETED: return 'Klar';
      case OrderStatus.CANCELLED: return 'Avbruten';
      default: return 'Okänd';
    }
  };

  const canCancelOrder = (order: ServiceOrder): boolean => {
    return order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED;
  };

  const shareOrderDetails = async (order: ServiceOrder) => {
    try {
      let shareMessage = '';

      if (order.serviceType === ServiceType.SHIPPING || order.serviceType === ServiceType.CONTAINER_SHIPPING) {
        const shippingOrder = order as any;
        const isContainer = order.serviceType === ServiceType.CONTAINER_SHIPPING;
        shareMessage = `${isContainer ? '🚢 Container Shipping' : '📦 Shipping'} order from Tunisiska Mega Service

Sender: ${shippingOrder.customerInfo?.name}
Phone: ${shippingOrder.customerInfo?.phone}

Recipient: ${shippingOrder.notes?.split('Recipient: ')[1]?.split(' (')[0] || 'N/A'}
Recipient Phone: ${shippingOrder.notes?.split('Recipient: ')[1]?.split(' (')[1]?.replace(')', '') || 'N/A'}

From: ${shippingOrder.pickupAddress}
To: ${shippingOrder.deliveryAddress}

${isContainer ? `Size: ${shippingOrder.packageDetails?.size}` : `Weight: ${shippingOrder.packageDetails?.weight}kg`}
Value: ${shippingOrder.packageDetails?.value} SEK

Date: ${formatDateTime(shippingOrder.scheduledDateTime)}
Status: ${getStatusDisplayName(shippingOrder.status)}

Total Cost: ${shippingOrder.totalPrice} SEK

Booking ID: ${shippingOrder.id?.substring(0, 8) || 'N/A'}`;
      } else {
        // Default share message for other order types
        shareMessage = `${getServiceDisplayName(order.serviceType)} beställning

Kund: ${order.customerInfo?.name}
Datum: ${formatDateTime(order.scheduledDateTime)}
Status: ${getStatusDisplayName(order.status)}
Pris: ${order.totalPrice} SEK

Bokningsnummer: ${order.id?.substring(0, 8) || 'N/A'}`;
      }

      await Share.share({
        message: shareMessage,
        title: 'Beställningsinformation',
      });
    } catch (error) {
      console.error('Error sharing order:', error);
      showAlert('Fel', 'Kunde inte dela beställningsinformationen');
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderOrderCard = (order: ServiceOrder, index: number) => (
    <Animated.View
      key={order.id}
      entering={FadeInDown.delay(index * 100)}
      className={`mb-4 rounded-xl overflow-hidden ${
        isDark ? 'bg-dark-card' : 'bg-light-card'
      }`}
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
      }}
    >
      <TouchableOpacity
        onPress={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
        className="p-4"
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View className={`p-2 rounded-full mr-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Ionicons
                name={getServiceIcon(order.serviceType)}
                size={20}
                color={isDark ? '#fff' : '#000'}
              />
            </View>
            <View className="flex-1">
              <AutoText className={`font-semibold ${isDark ? 'text-white' : 'text-black'}`}>
                {getServiceDisplayName(order.serviceType)}
              </AutoText>
              <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {order.id.substring(0, 8)}...
              </AutoText>
            </View>
          </View>
          
          <View className="items-end">
            <View
              className="px-2 py-1 rounded-full"
              style={{ backgroundColor: getStatusColor(order.status) + '20' }}
            >
              <AutoText
                className="text-xs font-medium"
                style={{ color: getStatusColor(order.status) }}
              >
                {getStatusDisplayName(order.status)}
              </AutoText>
            </View>
            <AutoText className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {order.totalPrice} SEK
            </AutoText>
          </View>
        </View>

        <View className="flex-row justify-between items-center">
          <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            📅 {formatDateTime(order.scheduledDateTime)}
          </AutoText>
          <Ionicons
            name={selectedOrder?.id === order.id ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={isDark ? '#9ca3af' : '#6b7280'}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Details */}
      {selectedOrder?.id === order.id && (
        <Animated.View entering={ZoomIn.duration(200)} className="px-4 pb-4 border-t border-gray-200">
          <View className="pt-4 space-y-3">
            {/* Customer Info */}
            <View>
              <AutoText className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
                Kunduppgifter
              </AutoText>
              <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {order.customerInfo.name}
              </AutoText>
              <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                📞 {order.customerInfo.phone}
              </AutoText>
              {order.customerInfo.email && (
                <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  ✉️ {order.customerInfo.email}
                </AutoText>
              )}
            </View>

            {/* Service Details */}
            <View>
              <AutoText className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
                Tjänstedetaljer
              </AutoText>
              {order.serviceType === ServiceType.MOVE && (
                <>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 Från: {(order as any).pickupAddress}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 Till: {(order as any).deliveryAddress}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📦 Föremål: {(order as any).numberOfItems}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    👥 Personer: {(order as any).numberOfPersons}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    🏢 Hiss: {(order as any).hasElevator ? 'Ja' : 'Nej'}
                  </AutoText>
                </>
              )}
              
              {order.serviceType === ServiceType.TAXI && (
                <>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 Från: {(order as any).pickupAddress}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 Till: {(order as any).destinationAddress}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    👥 Passagerare: {(order as any).numberOfPassengers}
                  </AutoText>
                </>
              )}
              
              {order.serviceType === ServiceType.CLEANING && (
                <>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 Adress: {(order as any).address}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    🏠 Rum: {(order as any).numberOfRooms}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    ✨ Typ: {(order as any).cleaningType}
                  </AutoText>
                </>
              )}

              {(order.serviceType === ServiceType.SHIPPING || order.serviceType === ServiceType.CONTAINER_SHIPPING) && (
                <>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 Från: {(order as any).pickupAddress}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 Till: {(order as any).deliveryAddress}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {order.serviceType === ServiceType.CONTAINER_SHIPPING 
                      ? `🚢 Size: ${(order as any).packageDetails?.size}` 
                      : `📦 Weight: ${(order as any).packageDetails?.weight}kg`}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📋 Details: {(order as any).packageDetails?.description || 'N/A'}
                  </AutoText>
                </>
              )}

              {order.serviceType === ServiceType.MOVE_CLEANING && (
                <>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 Från: {(order as any).pickupAddress}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 Till: {(order as any).deliveryAddress}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📦 Föremål: {(order as any).numberOfItems}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    👥 Personer: {(order as any).numberOfPersons}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    🧹 Städning: {(order as any).cleaningAreas?.join(', ')}
                  </AutoText>
                  <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    ✨ Intensitet: {(order as any).cleaningIntensity}
                  </AutoText>
                </>
              )}
            </View>

            {/* Payment Info */}
            <View>
              <AutoText className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
                Betalning
              </AutoText>
              <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                💰 Totalt: {order.totalPrice} SEK
              </AutoText>
              {order.pointsUsed && order.pointsUsed > 0 && (
                <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  🎁 Poäng använt: {order.pointsUsed}
                </AutoText>
              )}
              <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                💳 Metod: {order.paymentMethod}
              </AutoText>
            </View>

            {/* Notes */}
            {order.notes && (
              <View>
                <AutoText className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-black'}`}>
                  Anteckningar
                </AutoText>
                <AutoText className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {order.notes}
                </AutoText>
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-3 pt-3">
              {canCancelOrder(order) && (
                <TouchableOpacity
                  onPress={() => {
                    showAlert(
                      'Avbryt beställning',
                      'Är du säker på att du vill avbryta denna beställning?',
                      [
                        { text: 'Nej', style: 'cancel' },
                        { text: 'Ja', onPress: () => cancelOrder(order.id) }
                      ]
                    );
                  }}
                  className="flex-1 bg-red-500 p-3 rounded-lg items-center"
                >
                  <AutoText className="text-white font-medium">Avbryt</AutoText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => shareOrderDetails(order)}
                className={`flex-1 p-3 rounded-lg items-center ${
                  isDark ? 'bg-green-600' : 'bg-green-500'
                }`}
              >
                <AutoText className="text-white font-medium">Dela</AutoText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  // You can add functionality to contact support or view more details
                  showAlert('Kontakt', 'Ring 070-123 45 67 för hjälp med denna beställning');
                }}
                className={`flex-1 p-3 rounded-lg items-center ${
                  isDark ? 'bg-blue-600' : 'bg-blue-500'
                }`}
              >
                <AutoText className="text-white font-medium">Kontakt</AutoText>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );

  return (
    <View className={`flex-1 ${isDark ? 'bg-dark' : 'bg-light'}`}>
      {/* Header */}
      <View className="px-6 pt-6 pb-4">
        <View className="flex-row items-center justify-center relative mb-4">
          <TouchableOpacity onPress={onBack} className="absolute left-0 p-2">
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <AutoText className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Mina Beställningar
          </AutoText>
        </View>
        <AutoText className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Se och hantera dina tjänstebeställningar
        </AutoText>
      </View>

      {/* Orders List */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <AutoText className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              Laddar beställningar...
            </AutoText>
          </View>
        ) : orders.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons
              name="document-outline"
              size={48}
              color={isDark ? '#6b7280' : '#9ca3af'}
              style={{ marginBottom: 16 }}
            />
            <AutoText className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
              Inga beställningar än
            </AutoText>
            <AutoText className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              När du bokar tjänster kommer de att visas här
            </AutoText>
          </View>
        ) : (
          orders.map((order, index) => renderOrderCard(order, index))
        )}
      </ScrollView>
    </View>
  );
}