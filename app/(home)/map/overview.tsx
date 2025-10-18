import { ShippingOrderService } from "@/app/services/shippingOrderService";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useTheme } from "../../context/ThemeContext";

// Disable React Native Reanimated strict mode warnings
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";

// Configure logger to only show errors
configureReanimatedLogger({
  level: ReanimatedLogLevel.error,
  strict: false,
});

export default function MapOverviewScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [activeShipments, setActiveShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverPositions, setDriverPositions] = useState<{
    [key: string]: {
      latitude: number;
      longitude: number;
      progress: number;
      lastUpdate?: Date;
    };
  }>({});
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
          const newPositions: {
            [key: string]: {
              latitude: number;
              longitude: number;
              progress: number;
            };
          } = {};
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
        console.error("Error fetching active shipments:", error);
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
      setDriverPositions((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((shipmentId) => {
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
            latitude:
              currentPos.latitude +
              totalMovement * (Math.random() > 0.5 ? 1 : -1),
            longitude:
              currentPos.longitude +
              totalMovement * (Math.random() > 0.5 ? 1 : -1),
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
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        region={{
          latitude: 59.3293,
          longitude: 18.0686,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        mapType={isDark ? "standard" : "standard"}
        customMapStyle={
          isDark
            ? [
                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                {
                  elementType: "labels.text.stroke",
                  stylers: [{ color: "#242f3e" }],
                },
                {
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#746855" }],
                },
                {
                  featureType: "administrative.locality",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#d59563" }],
                },
                {
                  featureType: "poi",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#d59563" }],
                },
                {
                  featureType: "poi.park",
                  elementType: "geometry",
                  stylers: [{ color: "#263c3f" }],
                },
                {
                  featureType: "poi.park",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#6b9a76" }],
                },
                {
                  featureType: "road",
                  elementType: "geometry",
                  stylers: [{ color: "#38414e" }],
                },
                {
                  featureType: "road",
                  elementType: "geometry.stroke",
                  stylers: [{ color: "#212a37" }],
                },
                {
                  featureType: "road",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#9ca5b3" }],
                },
                {
                  featureType: "road.highway",
                  elementType: "geometry",
                  stylers: [{ color: "#746855" }],
                },
                {
                  featureType: "road.highway",
                  elementType: "geometry.stroke",
                  stylers: [{ color: "#1f2835" }],
                },
                {
                  featureType: "road.highway",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#f3d19c" }],
                },
                {
                  featureType: "transit",
                  elementType: "geometry",
                  stylers: [{ color: "#2f3948" }],
                },
                {
                  featureType: "transit.station",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#d59563" }],
                },
                {
                  featureType: "water",
                  elementType: "geometry",
                  stylers: [{ color: "#17263c" }],
                },
                {
                  featureType: "water",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#515c6d" }],
                },
                {
                  featureType: "water",
                  elementType: "labels.text.stroke",
                  stylers: [{ color: "#17263c" }],
                },
              ]
            : []
        }
      >
        {activeShipments.map((shipment, index) => {
          const driverPos = driverPositions[shipment._id];

          const latitude =
            driverPos?.latitude || 59.3293 + (Math.random() - 0.5) * 0.02;
          const longitude =
            driverPos?.longitude || 18.0686 + (Math.random() - 0.5) * 0.02;
          return (
            <Marker
              key={shipment._id}
              coordinate={{ latitude, longitude }}
              pinColor={shipment.status === "in_progress" ? "orange" : "blue"}
            >
              <Callout tooltip>
                <View
                  style={{
                    backgroundColor: isDark ? "#000" : "#f9fafb",
                    borderRadius: 10,
                    padding: 8,
                    width: 220,
                    shadowColor: "#000",
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "bold",
                      fontSize: 14,
                      marginBottom: 4,
                      textAlign: "center",
                      color: isDark ? "#F1F5F9" : "#1E293B",
                    }}
                  >
                    {shipment.pickupAddress} → {shipment.deliveryAddress}
                  </Text>
                  <Text style={{ color: isDark ? "#F1F5F9" : "#1E293B", fontSize: 11 ,   textAlign: "center", }}>
                    Status:{" "}
                    {shipment.status === "confirmed"
                      ? "Bekräftad"
                      : shipment.status === "in_progress"
                        ? "Pågående"
                        : "Avslutad"}
                  </Text>
                  <Text style={{ color: isDark ? "#F1F5F9" : "#1E293B", fontSize: 10, marginTop: 2 ,   textAlign: "center", }}>
                    {activeShipments.length} aktiva frakter
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Loading indicator */}
      {loading && (
        <View
          style={{
            position: "absolute",
            top: 50,
            left: 20,
            right: 20,
            backgroundColor: isDark
              ? "rgba(15, 23, 42, 0.9)"
              : "rgba(255, 255, 255, 0.9)",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text
            style={{
              color: isDark ? "#F1F5F9" : "#1E293B",
              fontSize: 16,
              fontWeight: "500",
            }}
          >
            Laddar kartdata...
          </Text>
        </View>
      )}
    </View>
  );
}
