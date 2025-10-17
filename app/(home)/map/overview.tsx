import React, { useState, useEffect } from "react";
import { View, Platform } from "react-native";
import { ShippingOrderService } from "@/app/services/shippingOrderService";
import { GoogleMaps, AppleMaps } from "expo-maps";

export default function MapOverviewScreen() {
  const [activeShipments, setActiveShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveShipments = async () => {
      try {
        const result = await ShippingOrderService.getAllActiveShippingOrders();

        if (result.success && result.orders) {
          setActiveShipments(result.orders);
        }
      } catch (error) {
        console.error('Error fetching active shipments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveShipments();

    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(fetchActiveShipments, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View className="flex-1">
      {/* Map Overview - Full Screen */}
      <View className="flex-1">
        {Platform.OS === 'ios' ? (
          <AppleMaps.View
            style={{
              flex: 1,
              borderRadius: 16,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
            cameraPosition={{
              coordinates: {
                latitude: 59.3293,
                longitude: 18.0686,
              },
              zoom: 10,
            }}
            markers={activeShipments.map((shipment) => ({
              coordinates: {
                latitude: 59.3293 + (Math.random() - 0.5) * 0.02,
                longitude: 18.0686 + (Math.random() - 0.5) * 0.02,
              },
              title: `Frakt #${shipment._id?.slice(-6)}`,
              description: shipment.status === 'confirmed' ? 'Bekräftad' : 'Pågående',
              pinColor: shipment.status === 'confirmed' ? 'blue' : 'orange',
            }))}
          />
        ) : (
          <GoogleMaps.View
            style={{
              flex: 1,
              borderRadius: 16,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
            cameraPosition={{
              coordinates: {
                latitude: 59.3293,
                longitude: 18.0686,
              },
              zoom: 10,
            }}
            markers={activeShipments.map((shipment) => ({
              coordinates: {
                latitude: 59.3293 + (Math.random() - 0.5) * 0.02,
                longitude: 18.0686 + (Math.random() - 0.5) * 0.02,
              },
              title: `Frakt #${shipment._id?.slice(-6)}`,
              snippet: shipment.status === 'confirmed' ? 'Bekräftad' : 'Pågående',
            }))}
          />
        )}
      </View>
    </View>
  );
}