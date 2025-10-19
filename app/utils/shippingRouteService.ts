import { routeCoordinates } from "@/app/utils/routeCoordinates";
import { client } from "@/sanityClient";
import * as Location from 'expo-location';

export const ShippingRouteService = {
  async getActiveRoute() {
    try {
      const query = `*[_type == "shippingSchedule" && isActive == true][0]{route}`;
      const result = await client.fetch(query);

      if (!result || !result.route) return null;

      // Map to coordinates
      const coords = routeCoordinates[result.route];
      if (!coords) throw new Error("Invalid route mapping");

      return coords;
    } catch (error) {
      console.error("Error fetching active route:", error);
      return null;
    }
  },

};

export const DriverService = {
  async getActiveDrivers() {
    const query = `*[_type == "users" && isDriver == true]{
      _id,
      email,
      driverLocation
    }`;
    return client.fetch(query);
  },

  async startLocationTracking(userId: string) {
    try {
      console.log('Starting location tracking for user:', userId);

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission denied');
        return false;
      }

      console.log('Location permission granted');

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      console.log('Current location:', location.coords);

      // Update location in Sanity
      await this.updateDriverLocation(userId, location.coords.latitude, location.coords.longitude);

      // Start watching location
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Or when moved 10 meters
        },
        async (newLocation) => {
          console.log('Location update:', newLocation.coords);
          await this.updateDriverLocation(userId, newLocation.coords.latitude, newLocation.coords.longitude);
        }
      );

      console.log('Location tracking started successfully');
      return locationSubscription;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  },

  async updateDriverLocation(userId: string, lat: number, lng: number) {
    try {
      // First check if user document exists
      const existingUser = await client.fetch(
        `*[_type == "users" && clerkId == $clerkId][0]`,
        { clerkId: userId }
      );

      if (!existingUser) {
        // Create user document if it doesn't exist
        await client.create({
          _type: 'users',
          clerkId: userId,
          isDriver: true,
          driverLocation: {
            _type: "geopoint",
            lat,
            lng,
          },
        });
      } else {
        // Update existing user document
        await client
          .patch(existingUser._id)
          .set({
            driverLocation: {
              _type: "geopoint",
              lat,
              lng,
            },
            isDriver: true,
          })
          .commit();
      }
      console.log('Driver location updated:', lat, lng);
    } catch (e) {
      console.error("Failed to update driver location", e);
    }
  }
};

export const updateDriverLocation = async (
  userId: string,
  lat: number,
  lng: number
) => {
  return DriverService.updateDriverLocation(userId, lat, lng);
};