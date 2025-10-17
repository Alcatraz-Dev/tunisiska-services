import React, { useState, useEffect } from "react";
import { View, Platform, Text } from "react-native";
import { ShippingOrderService } from "@/app/services/shippingOrderService";
import { GoogleMaps, AppleMaps } from "expo-maps";
import * as Location from "expo-location";

// Disable React Native Reanimated strict mode warnings
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

// Configure logger to only show errors
configureReanimatedLogger({
  level: ReanimatedLogLevel.error,
  strict: false,
});

export default function MapOverviewScreen() {
  const [activeShipments, setActiveShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverPositions, setDriverPositions] = useState<{[key: string]: {latitude: number, longitude: number, progress: number, lastUpdate?: Date}}>({});
  const [locationPermission, setLocationPermission] = useState<boolean>(false);

  useEffect(() => {
    // Skip location permission request for now to avoid crashes
    // Location permissions are configured in app.config.js
    setLocationPermission(true);

    const fetchActiveShipments = async () => {
      try {
        const result = await ShippingOrderService.getAllActiveShippingOrders();

        if (result.success && result.orders) {
          // Show ONLY real shipping orders from Sanity
          const realOrders = result.orders;

          // If no real orders, show a message instead of mock data
          if (realOrders.length === 0) {
            setActiveShipments([]);
          } else {
            setActiveShipments(realOrders);
          }

          // Initialize driver positions for all shipments
          const newPositions: {[key: string]: {latitude: number, longitude: number, progress: number}} = {};
          realOrders.forEach((shipment: any, index: number) => {
            newPositions[shipment._id] = {
              latitude: 59.3293 + (Math.random() - 0.5) * 0.05, // Spread around Stockholm
              longitude: 18.0686 + (Math.random() - 0.5) * 0.05,
              progress: Math.random() * 0.8, // Random progress
            };
          });
          setDriverPositions(newPositions);
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

    // REAL GPS TRACKING IMPLEMENTATION
    // Since we don't have driver mobile apps yet, we'll simulate more realistic GPS
    // In production, this would be replaced with actual GPS data from drivers

    const gpsUpdateInterval = setInterval(() => {
      setDriverPositions(prev => {
        const updated = {...prev};
        Object.keys(updated).forEach(shipmentId => {
          const currentPos = updated[shipmentId];

          // Simulate realistic driving patterns
          // Drivers typically move in somewhat straight lines with occasional turns
          const baseMovement = 0.0003; // Base movement distance
          const randomFactor = (Math.random() - 0.5) * 0.0002; // Small random variation

          // Occasionally make bigger movements to simulate highway driving
          const highwayBoost = Math.random() < 0.1 ? 0.0005 : 0;

          const totalMovement = baseMovement + randomFactor + highwayBoost;

          updated[shipmentId] = {
            ...currentPos,
            latitude: currentPos.latitude + totalMovement * (Math.random() > 0.5 ? 1 : -1),
            longitude: currentPos.longitude + totalMovement * (Math.random() > 0.5 ? 1 : -1),
            progress: Math.min(0.95, currentPos.progress + 0.001), // Very gradual progress
            lastUpdate: new Date(),
          };
        });
        return updated;
      });
    }, 3000); // Update every 3 seconds for smooth animation

    return () => {
      clearInterval(interval);
      clearInterval(gpsUpdateInterval);
    };
  }, []);

  return (
    <View className="flex-1">

      {/* Map Overview - Full Screen */}
      <View style={{flex: 1}}>
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
            markers={activeShipments.map((shipment) => {
              const driverPos = driverPositions[shipment._id];
              if (!driverPos) {
                // Fallback if no position data
                return {
                  coordinates: {
                    latitude: 59.3293 + (Math.random() - 0.5) * 0.02,
                    longitude: 18.0686 + (Math.random() - 0.5) * 0.02,
                  },
                  title: `Frakt #${shipment._id?.slice(-6)}`,
                  description: `Förare - ${shipment.status === 'confirmed' ? 'Bekräftad' : 'Pågående'}`,
                  pinColor: 'blue' as const,
                };
              }

              return {
                coordinates: {
                  latitude: driverPos.latitude,
                  longitude: driverPos.longitude,
                },
                title: `${shipment.pickupAddress} → ${shipment.deliveryAddress}`,
                description: `Förare - ${shipment.status === 'confirmed' ? 'Bekräftad' : 'Pågående'}`,
                pinColor: 'blue' as const,
              };
            })}
            polylines={[]} // Remove polylines - just show driver markers
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
            markers={activeShipments.map((shipment) => {
              const driverPos = driverPositions[shipment._id];
              if (!driverPos) {
                // Fallback if no position data
                return {
                  coordinates: {
                    latitude: 59.3293 + (Math.random() - 0.5) * 0.02,
                    longitude: 18.0686 + (Math.random() - 0.5) * 0.02,
                  },
                  title: `Frakt #${shipment._id?.slice(-6)}`,
                  snippet: `Förare - ${shipment.status === 'confirmed' ? 'Bekräftad' : 'Pågående'}`,
                };
              }

              return {
                coordinates: {
                  latitude: driverPos.latitude,
                  longitude: driverPos.longitude,
                },
                title: `${shipment.pickupAddress} → ${shipment.deliveryAddress}`,
                snippet: `Förare - ${shipment.status === 'confirmed' ? 'Bekräftad' : 'Pågående'}`,
              };
            })}
            polylines={[]} // Remove polylines - just show driver markers
          />
        )}
      </View>
    </View>
  );
}