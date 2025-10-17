import React, { useState, useEffect } from "react";
import { View, Platform, Text } from "react-native";
import { ShippingOrderService } from "@/app/services/shippingOrderService";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { useTheme } from "../../context/ThemeContext";

// Disable React Native Reanimated strict mode warnings
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

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

  // Create HTML for embedded Google Maps with theme support
  const createMapHTML = () => {
    const markers = activeShipments.map((shipment, index) => {
      const driverPos = driverPositions[shipment._id];
      const lat = driverPos?.latitude || (59.3293 + (Math.random() - 0.5) * 0.02);
      const lng = driverPos?.longitude || (18.0686 + (Math.random() - 0.5) * 0.02);
      const title = shipment.pickupAddress && shipment.deliveryAddress
        ? `${shipment.pickupAddress} → ${shipment.deliveryAddress}`
        : `Frakt #${shipment._id?.slice(-6)}`;

      // Theme-aware marker colors
      const markerColor = isDark ? '#60A5FA' : '#3B82F6'; // Blue-400 for dark, Blue-500 for light
      const textColor = isDark ? '#1E293B' : '#FFFFFF'; // Slate-800 for dark, white for light

      return `
        var marker${index} = new google.maps.Marker({
          position: { lat: ${lat}, lng: ${lng} },
          map: map,
          title: "${title}",
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="${markerColor}" stroke="white" stroke-width="3"/><text x="16" y="21" text-anchor="middle" fill="${textColor}" font-size="16" font-weight="bold">🚚</text></svg>'),
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20)
          }
        });

        var infoWindow${index} = new google.maps.InfoWindow({
          content: "<div style='color: ${isDark ? '#E2E8F0' : '#1E293B'}; font-family: system-ui, -apple-system, sans-serif;'><strong style='color: ${isDark ? '#60A5FA' : '#3B82F6'};'>${title}</strong><br/>Status: <span style='color: ${shipment.status === 'confirmed' ? '#10B981' : '#F59E0B'};'>${shipment.status === 'confirmed' ? 'Bekräftad' : 'Pågående'}</span></div>"
        });

        marker${index}.addListener('click', function() {
          infoWindow${index}.open(map, marker${index});
        });
      `;
    }).join('\n');

    // Always use dark theme for better mobile experience
    const mapStyles = `
      [
        { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
        {
          featureType: "administrative.country",
          elementType: "geometry.stroke",
          // stylers: [{ color: "#334155" }]
        },
        {
          featureType: "administrative.land_parcel",
          elementType: "labels.text.fill",
          stylers: [{ color: "#64748b" }]
        },
        {
          featureType: "administrative.province",
          elementType: "geometry.stroke",
          stylers: [{ color: "#334155" }]
        },
        {
          featureType: "landscape.man_made",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1e293b" }]
        },
        {
          featureType: "landscape.natural",
          elementType: "geometry",
          stylers: [{ color: "#0f172a" }]
        },
        {
          featureType: "poi",
          elementType: "geometry",
          stylers: [{ color: "#1e293b" }]
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#64748b" }]
        },
        {
          featureType: "poi",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#0f172a" }]
        },
        {
          featureType: "poi.park",
          elementType: "geometry.fill",
          stylers: [{ color: "#1e293b" }]
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#475569" }]
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#1e293b" }]
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#94a3b8" }]
        },
        {
          featureType: "road",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#0f172a" }]
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#334155" }]
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1e293b" }]
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.fill",
          stylers: [{ color: "#cbd5e1" }]
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#0f172a" }]
        },
        {
          featureType: "transit",
          elementType: "labels.text.fill",
          stylers: [{ color: "#64748b" }]
        },
        {
          featureType: "transit",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#0f172a" }]
        },
        {
          featureType: "transit.line",
          elementType: "geometry.fill",
          stylers: [{ color: "#1e293b" }]
        },
        {
          featureType: "transit.station",
          elementType: "geometry",
          stylers: [{ color: "#334155" }]
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#1e293b" }]
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#475569" }]
        }
      ]
    `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Map Overview</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBDaeWicvigtP9xPv919E-RNoxfvC-Hqik"></script>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              font-family: system-ui, -apple-system, sans-serif;
            }
            #map { height: 100%; width: 100%; }
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 16px;
              color: ${isDark ? '#E2E8F0' : '#64748B'};
              background: ${isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)'};
              padding: 12px 20px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body style="background: ${isDark ? '#0F172A' : '#FFFFFF'};">
          <div id="map"></div>
          <div class="loading" id="loading">Laddar karta...</div>
          <script>
            function initMap() {
              const stockholm = { lat: 59.3293, lng: 18.0686 };
              const map = new google.maps.Map(document.getElementById('map'), {
                zoom: 10,
                center: stockholm,
                styles: ${mapStyles},
                disableDefaultUI: false,
                zoomControl: false,
                mapTypeControl: false,
                scaleControl: false,
                streetViewControl: false,
                rotateControl: false,
                fullscreenControl: false
              });

              document.getElementById('loading').style.display = 'none';

              ${markers}
            }

            window.onload = initMap;
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View className="flex-1">
      <WebView
        source={{ html: createMapHTML() }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error: ', nativeEvent);
        }}
      />

      {/* Bottom overlay with truck icon and shipment count - bottom left corner */}
      <View style={{
        position: 'absolute',
        bottom: 100, // More space above navbar
        left: 16,
        width: 'auto',
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.2)'
      }}>
        {/* Truck icon - smaller */}
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#3B82F6',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10
        }}>
          <Text style={{ fontSize: 16 }}>🚚</Text>
        </View>

        {/* Shipment info - compact */}
        <View>
          <Text style={{
            fontSize: 13,
            fontWeight: '600',
            color: '#F1F5F9',
            marginBottom: 1
          }}>
            {activeShipments.length} aktiva  frakter 
          </Text>
          <Text style={{
            fontSize: 11,
            color: '#94A3B8'
          }}>
       Stockholm - Tunis
          </Text>
        </View>
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={{
          position: 'absolute',
          top: 50,
          left: 20,
          right: 20,
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          borderRadius: 12,
          padding: 16,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{
            color: isDark ? '#F1F5F9' : '#1E293B',
            fontSize: 16,
            fontWeight: '500'
          }}>
            Laddar kartdata...
          </Text>
        </View>
      )}
    </View>
  );
}