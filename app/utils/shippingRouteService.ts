
import { routeCoordinates } from "@/app/utils/routeCoordinates";
import { client } from "@/sanityClient";

export const ShippingRouteService = {
  async getActiveRoute() {
    try {
      const query = `*[_type == "shippingSchedule" && isActive == true][0]{route}`;
      const result = await client.fetch(query);

      if (!result || !result.route) throw new Error("No active route found");

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