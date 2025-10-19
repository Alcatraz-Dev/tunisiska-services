import polyline from "@mapbox/polyline"; // decode polyline from Directions API
import { useCallback, useEffect, useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import MapView, {
  Callout,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { useTheme } from "../../context/ThemeContext";
import {
  DriverService,
  ShippingRouteService,
} from "@/app/utils/shippingRouteService";
import { AutoText } from "@/app/components/ui/AutoText";
import { useFocusEffect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import * as Location from "expo-location";

export default function MapOverviewScreen() {
  const [route, setRoute] = useState<any>(null);
  const [driverIndex, setDriverIndex] = useState(0);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentUserLocation, setCurrentUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isCurrentUserDriver, setIsCurrentUserDriver] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { user } = useUser();

  const defaultCoord = { latitude: 59.3293, longitude: 18.0686 };
  useEffect(() => {
    if (routeCoords.length === 0) return;
    const interval = setInterval(() => {
      setDriverIndex((prev) =>
        prev + 1 < routeCoords.length ? prev + 1 : routeCoords.length - 1
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [routeCoords]);
  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkAndStartLocationTracking = async () => {
      if (!user) return;

      try {
        // Check if user is a driver from Sanity
        const { client } = await import("@/sanityClient");
        const userDoc = await client.fetch(
          `*[_type == "users" && clerkId == $clerkId][0]{isDriver}`,
          { clerkId: user.id }
        );

        const isDriver = userDoc?.isDriver || false;
        setIsCurrentUserDriver(isDriver);

        if (isDriver) {
          // Start location tracking if user is a driver
          const subscription = await DriverService.startLocationTracking(
            user.id
          );

          // Get current location immediately for display
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            setCurrentUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        }
      } catch (error) {
        console.error("Error checking driver status:", error);
      }
    };

    checkAndStartLocationTracking();
  }, [user]);
  const fetchActiveRoute = async () => {
    try {
      const result = await ShippingRouteService.getActiveRoute();
      if (result) setRoute(result);
    } catch (e) {
      console.error("Error fetching active route:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleRoute = async (from: any, to: any) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await res.json();
      if (json.routes.length > 0) {
        const points = polyline.decode(json.routes[0].overview_polyline.points);
        setRouteCoords(
          points.map(([lat, lng]: [number, number]) => ({
            latitude: lat,
            longitude: lng,
          }))
        );
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

  const FROM = route
    ? { latitude: route.from.lat, longitude: route.from.lng }
    : defaultCoord;
  const TO = route
    ? { latitude: route.to.lat, longitude: route.to.lng }
    : defaultCoord;
  const driverCoord = routeCoords[driverIndex] || FROM;
  const fetchDrivers = async () => {
    try {
      const activeDrivers = await DriverService.getActiveDrivers();
      console.log("Fetched drivers:", activeDrivers);
      setDrivers(Array.isArray(activeDrivers) ? activeDrivers : []);
    } catch (e) {
      console.error("Failed to fetch drivers:", e);
      setDrivers([]);
    }
  };

  const getCurrentLocation = async () => {
    if (!isCurrentUserDriver || !user) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Location permission denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentUserLocation(newLocation);

      // Update location in Sanity for other users to see
      await DriverService.updateDriverLocation(
        user.id,
        newLocation.latitude,
        newLocation.longitude
      );

      console.log("Manual location update:", newLocation);
    } catch (error) {
      console.error("Error getting current location:", error);
    }
  };
  useFocusEffect(
    useCallback(() => {
      fetchActiveRoute(); // fetch every time screen comes into view
    }, [])
  );
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
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  backgroundColor: isDark ? "#000000" : "#fff",
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
                <AutoText
                  style={{
                    color: isDark ? "#f1f5f9" : "#000000",
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  📦 Upphämtning
                </AutoText>
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
                  borderTopColor: isDark ? "#000000" : "#fff",
                  marginTop: -1,
                }}
              />
            </View>
          </Callout>
        </Marker>

        {/* Delivery */}
        <Marker coordinate={TO} pinColor="red">
          <Callout tooltip>
            <View style={{ alignItems: "center", marginBottom: 6 }}>
              <View
                style={{
                  backgroundColor: isDark ? "#000000" : "#ffffff",
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
                <AutoText
                  style={{
                    color: isDark ? "#f8fafc" : "#000000",
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  🎯 Leverans
                </AutoText>
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
                  borderTopColor: isDark ? "#000000" : "#ffffff",
                  marginTop: -1,
                }}
              />
            </View>
          </Callout>
        </Marker>

        {/* Other Drivers */}
        {drivers
          .filter(
            (d) =>
              d.driverLocation &&
              d.driverLocation.lat &&
              d.driverLocation.lng &&
              d._id !== user?.id
          )
          .map((d, index) => (
            <Marker
              key={d._id || index}
              coordinate={{
                latitude: d.driverLocation.lat,
                longitude: d.driverLocation.lng,
              }}
              pinColor="orange"
            >
              <Callout tooltip>
                <View style={{ alignItems: "center", marginBottom: 6 }}>
                  <View
                    style={{
                      backgroundColor: isDark ? "#000000" : "#ffffff",
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
                    <AutoText
                      style={{
                        color: isDark ? "#f1f5f9" : "#000000",
                        fontWeight: "600",
                        fontSize: 12,
                      }}
                    >
                      🚚 Förare
                    </AutoText>
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
                      borderTopColor: isDark ? "#000000" : "#ffffff",
                      marginTop: -1,
                    }}
                  />
                </View>
              </Callout>
            </Marker>
          ))}

        {/* Current User Driver Location */}
        {isCurrentUserDriver && currentUserLocation && (
          <Marker 
          coordinate={currentUserLocation}
          // for testing 
          // coordinate={routeCoords[driverIndex]}
           pinColor="blue">
            <Callout tooltip>
              <View style={{ alignItems: "center", marginBottom: 6 }}>
                <View
                  style={{
                    backgroundColor: isDark ? "#000000" : "#ffffff",
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
                  <AutoText
                    style={{
                      color: isDark ? "#f1f5f9" : "#000000",
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    🚚 Du (Förare)
                  </AutoText>
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
                    borderTopColor: isDark ? "#000000" : "#ffffff",
                    marginTop: -1,
                  }}
                />
              </View>
            </Callout>
          </Marker>
        )}

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
          <AutoText style={{ color: isDark ? "#fff" : "#000" }}>
            Laddar rutt...
          </AutoText>
        </View>
      )}
      {!route && !loading && (
        <View
          style={{
            position: "absolute",
            top: 20,
            alignSelf: "center",
            backgroundColor: isDark ? "#1e293b" : "#fff",
            padding: 8,
            borderRadius: 8,
          }}
        >
          <AutoText style={{ color: isDark ? "#f1f5f9" : "#000" }}>
            Ingen aktiv rutt
          </AutoText>
        </View>
      )}

      {/* Driver Location Button */}
      {isCurrentUserDriver && (
        <View
          style={{
            position: "absolute",
            bottom: 110,
            right: 20,
            backgroundColor: isDark ? "#000000" : "#fff",
            borderRadius: 25,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 2 },
            elevation: 5,
          }}
        >
          <TouchableOpacity
            onPress={getCurrentLocation}
            style={{
              padding: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AutoText
              style={{
                color: isDark ? "#f1f5f9" : "#00000",
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              📍 Uppdatera
            </AutoText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
