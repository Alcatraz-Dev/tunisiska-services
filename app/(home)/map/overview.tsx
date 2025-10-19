import { ShippingOrderService } from "@/app/services/shippingOrderService";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import MapView, {
  Callout,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { useTheme } from "../../context/ThemeContext";
import React from "react";
import polyline from "@mapbox/polyline"; // decode polyline from Directions API

// Stockholm → Tunis coordinates
const STOCKHOLM = { latitude: 59.3293, longitude: 18.0686 };
const TUNIS = { latitude: 36.8065, longitude: 10.1815 };

// Replace with your API key
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function MapOverviewScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [activeShipments, setActiveShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [driverIndex, setDriverIndex] = useState(0);

  // Fetch road path between Stockholm and Tunis
  const fetchRoute = async () => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${STOCKHOLM.latitude},${STOCKHOLM.longitude}&destination=${TUNIS.latitude},${TUNIS.longitude}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await response.json();
      if (json.routes.length > 0) {
        const points = polyline.decode(json.routes[0].overview_polyline.points);
        const coords = points.map(([lat, lng]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        }));
        setRouteCoords(coords);
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  };

  useEffect(() => {
    fetchRoute();

    const fetchOrders = async () => {
      const result = await ShippingOrderService.getAllActiveShippingOrders();
      if (result.success && result.orders) setActiveShipments(result.orders);
      setLoading(false);
    };
    fetchOrders();
  }, []);

  // Animate driver along the route
  useEffect(() => {
    if (routeCoords.length === 0) return;

    const interval = setInterval(() => {
      setDriverIndex((prev) =>
        prev + 1 < routeCoords.length ? prev + 1 : routeCoords.length - 1
      );
    }, 2000); // move every 2s

    return () => clearInterval(interval);
  }, [routeCoords]);

  const driverCoord = routeCoords[driverIndex] || STOCKHOLM;

  return (
    <View className="flex-1">
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        region={{
          latitude: STOCKHOLM.latitude,
          longitude: STOCKHOLM.longitude,
          latitudeDelta: 20,
          longitudeDelta: 20,
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
        {/* Pickup */}
        <Marker coordinate={STOCKHOLM} pinColor="green">
          <Callout tooltip>
            <View
              style={{
                backgroundColor: isDark ? "black" : "white",
                padding: 8,
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  color: isDark ? "white" : "black",
                  fontSize: 10,
                }}
              >
                Pickup
              </Text>
            </View>
          </Callout>
        </Marker>

        {/* Delivery */}
        <Marker coordinate={TUNIS} pinColor="red">
          <Callout tooltip>
            <View
              style={{
                backgroundColor: isDark ? "black" : "white",
                padding: 8,
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  color: isDark ? "white" : "black",
                  fontSize: 10,
                }}
              >
                Delivery
              </Text>
            </View>
          </Callout>
        </Marker>

        {/* Driver */}
        <Marker coordinate={driverCoord} pinColor="orange">
          <Callout tooltip>
            <View
              style={{
                backgroundColor: isDark ? "black" : "white",
                padding: 8,
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  color: isDark ? "white" : "black",
                  fontSize: 10,
                }}
              >
                Driver
              </Text>
            </View>
          </Callout>
        </Marker>

        {/* Polyline path */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="orange"
            strokeWidth={4}
          />
        )}
      </MapView>

      {loading && (
        <View
          style={{
            position: "absolute",
            top: 50,
            left: 20,
            right: 20,
            backgroundColor: isDark
              ? "rgba(15,23,42,0.9)"
              : "rgba(255,255,255,0.9)",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: isDark ? "#fff" : "#000" }}>
            Loading route...
          </Text>
        </View>
      )}
    </View>
  );
}
