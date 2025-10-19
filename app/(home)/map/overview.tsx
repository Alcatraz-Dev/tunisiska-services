import { ShippingOrderService } from "@/app/services/shippingOrderService";
import polyline from "@mapbox/polyline"; // decode polyline from Directions API
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import MapView, {
  Callout,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { useTheme } from "../../context/ThemeContext";
import { routeCoordinates } from "@/app/utils/routeCoordinates";
import { ShippingRouteService } from "@/app/utils/shippingRouteService";


export default function MapOverviewScreen() {
  const [route, setRoute] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [driverIndex, setDriverIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const fetchActiveRoute = async () => {
    const result = await ShippingRouteService.getActiveRoute();
    if (result) setRoute(result);
    setLoading(false);
  };

  const fetchGoogleRoute = async (from: any, to: any) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await res.json();
      if (json.routes.length > 0) {
        const points = polyline.decode(json.routes[0].overview_polyline.points);
        const coords = points.map(([lat, lng]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        }));
        setRouteCoords(coords as any);
      }
    } catch (e) {
      console.error("Error fetching route:", e);
    }
  };

  useEffect(() => {
    fetchActiveRoute();
  }, []);

  useEffect(() => {
    if (route) fetchGoogleRoute(route.from, route.to);
  }, [route]);

  useEffect(() => {
    if (routeCoords.length === 0) return;
    const interval = setInterval(() => {
      setDriverIndex((prev) =>
        prev + 1 < routeCoords.length ? prev + 1 : routeCoords.length - 1
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [routeCoords]);

  if (!route)
    return (
      <View className="flex-1 items-center justify-center">
        <Text>No active route found</Text>
      </View>
    );

  const FROM = { latitude: route.from.lat, longitude: route.from.lng };
  const TO = { latitude: route.to.lat, longitude: route.to.lng };
  const driverCoord = routeCoords[driverIndex] || FROM;

  return (
    <View className="flex-1">
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        region={{
          latitude: FROM.latitude,
          longitude: FROM.longitude,
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
        <Marker coordinate={FROM} pinColor="green">
          <Callout tooltip>
            <View
              style={{
                alignItems: "center",
              }}
            >
              <View
                style={{
                  backgroundColor: isDark ? "#0f172a" : "#fff",
                  borderRadius: 10,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 2,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    color: isDark ? "#f1f5f9" : "#0f172a",
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  📦 Pickup
                </Text>
              </View>

              {/* Small triangle pointer */}
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 6,
                  borderRightWidth: 6,
                  borderTopWidth: 8,
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  borderTopColor: isDark ? "#0f172a" : "#fff",
                  marginTop: -1,
                }}
              />
            </View>
          </Callout>
        </Marker>

        {/* Delivery */}
        <Marker coordinate={TO} pinColor="red">
          <Callout tooltip>
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  borderRadius: 10,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  shadowColor: "#000",
                  shadowOpacity: 0.25,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 2,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    color: isDark ? "#f8fafc" : "#0f172a",
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  🎯 Delivery
                </Text>
              </View>

              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 6,
                  borderRightWidth: 6,
                  borderTopWidth: 8,
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  borderTopColor: isDark ? "#1e293b" : "#ffffff",
                  marginTop: -1,
                }}
              />
            </View>
          </Callout>
        </Marker>

        {/* Driver */}
        <Marker coordinate={driverCoord} pinColor="orange">
          <Callout tooltip>
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
                  borderRadius: 10,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  shadowColor: "#000",
                  shadowOpacity: 0.25,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 2,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    color: isDark ? "#f1f5f9" : "#0f172a",
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  🚚 Driver
                </Text>
              </View>

              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 6,
                  borderRightWidth: 6,
                  borderTopWidth: 8,
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  borderTopColor: isDark ? "#1e1e1e" : "#ffffff",
                  marginTop: -1,
                }}
              />
            </View>
          </Callout>
        </Marker>

        {/* Polyline path */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={isDark ? "#f97316" : "#ea580c"} // dark/light orange
            strokeWidth={3}
            lineJoin="round"
            lineCap="round"
            geodesic={true} // smoother curve on globe
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
