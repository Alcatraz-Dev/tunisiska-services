import { client } from "@/sanityClient";
import { nativeNotifyAPI } from "@/app/services/nativeNotifyApi";

export interface ContainerShippingOrderData {
  userId: string;
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  route: string;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledDateTime: string;
  packageDetails: {
    size: "20ft" | "40ft";
    description: string;
    value: number;
  };
  totalPrice: number;
  paymentMethod: "stripe" | "points" | "combined" | "cash";
  notes?: string;
}

export class ContainerShippingOrderService {
  // Create a new container shipping order in Sanity
  static async createShippingOrder(
    orderData: ContainerShippingOrderData
  ): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log(
        "📦 Creating container shipping order in Sanity:",
        orderData.customerInfo.name
      );

      const order = {
        _type: "containerShippingOrder",
        userId: orderData.userId,
        serviceType: "container-shipping",
        status: "pending",
        customerInfo: orderData.customerInfo,
        route: orderData.route,
        pickupAddress: orderData.pickupAddress,
        deliveryAddress: orderData.deliveryAddress,
        scheduledDateTime: orderData.scheduledDateTime,
        packageDetails: orderData.packageDetails,
        totalPrice: orderData.totalPrice,
        paymentMethod: orderData.paymentMethod,
        notes: orderData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await client.create(order);
      console.log(
        "✅ Container shipping order created successfully in Sanity:",
        result._id
      );

      // Update schedule capacity
      if (orderData.scheduledDateTime) {
        await this.updateShippingScheduleCapacity(
          orderData.scheduledDateTime,
          1, // 1 container
          orderData.route
        );
      }

      return { success: true, order: result };
    } catch (error: any) {
      console.error("💥 Error creating container shipping order in Sanity:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }

  // Update schedule capacity when order is created
  static async updateShippingScheduleCapacity(
    scheduledDateTime: string,
    capacityUsed: number,
    route: string
  ): Promise<void> {
    try {
      const scheduledDate = new Date(scheduledDateTime);
      const scheduleDateStr = scheduledDate.toISOString().split("T")[0];

      console.log(
        "📦 Updating container shipping schedule capacity for date:",
        scheduleDateStr,
        "capacity used:",
        capacityUsed
      );

      const startOfDay = new Date(scheduledDate);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(scheduledDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const schedules = await client.fetch(
        `*[
    _type == "containerShippingSchedule" &&
    status == "available" &&
    isActive == false &&
    route == $route &&
    departureTime >= $startOfDay &&
    departureTime <= $endOfDay
  ] | order(departureTime asc)`,
        {
          route,
          startOfDay: startOfDay.toISOString(),
          endOfDay: endOfDay.toISOString(),
        }
      );

      if (!schedules.length) {
        console.log("⚠️ No container schedules found for this date and time window");
        return;
      }

      for (const schedule of schedules) {
        const currentCapacity =
          schedule.availableCapacity ?? schedule.capacity ?? 0;
        const newCapacity = Math.max(0, currentCapacity - capacityUsed);

        await client
          .patch(schedule._id)
          .set({
            availableCapacity: newCapacity,
            status: newCapacity <= 0 ? "full" : "available",
          })
          .commit();

        console.log(
          `✅ Container Schedule ${schedule._id} updated: ${currentCapacity} → ${newCapacity}`
        );
      }
    } catch (error) {
      console.error("💥 Error updating container shipping schedule capacity:", error);
    }
  }

  // Get user's shipping orders
  static async getUserShippingOrders(
    userId: string
  ): Promise<{ success: boolean; orders?: any[]; error?: string }> {
    try {
      console.log("🔍 Fetching container shipping orders for user:", userId);

      const orders = await client.fetch(
        `*[_type == "containerShippingOrder" && userId == $userId] | order(createdAt desc)`,
        { userId }
      );

      console.log(`✅ Found ${orders.length} container shipping orders for user`);
      return { success: true, orders };
    } catch (error: any) {
      console.error("💥 Error fetching container shipping orders:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }

  // Get shipping order by ID
  static async getShippingOrder(
    orderId: string
  ): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      const order = await client.fetch(
        `*[_type == "containerShippingOrder" && _id == $orderId][0]`,
        { orderId }
      );

      if (order) {
        return { success: true, order };
      } else {
        return { success: false, error: "Order not found" };
      }
    } catch (error: any) {
      console.error("💥 Error fetching container shipping order:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }

  // Update shipping order status
  static async updateShippingOrderStatus(
    orderId: string,
    status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"
  ): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      const result = await client
        .patch(orderId)
        .set({
          status,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      return { success: true, order: result };
    } catch (error: any) {
      console.error("💥 Error updating container shipping order status:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }

  // Cancel shipping order
  static async cancelShippingOrder(
    orderId: string,
    reason?: string
  ): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      const updateData: any = {
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      };

      if (reason) {
        updateData.notes =
          (updateData.notes ? updateData.notes + "\n" : "") +
          `Cancellation reason: ${reason}`;
      }

      const result = await client.patch(orderId).set(updateData).commit();

      return { success: true, order: result };
    } catch (error: any) {
      console.error("💥 Error cancelling container shipping order:", error);
      return {
        success: false,
        error: error.message || "Unknown error occurred",
      };
    }
  }

  // Send order confirmation notification
  static async sendOrderConfirmationNotification(
    userId: string,
    orderData: ContainerShippingOrderData
  ) {
    try {
      const notificationPayload = {
        title: "Container shipping confirmed! 🚢",
        message: `Your container shipping from ${orderData.route.split("_")[0]} to ${orderData.route.split("_")[1]} is booked for ${new Date(orderData.scheduledDateTime).toLocaleString("sv-SE")}. Total price: ${orderData.totalPrice} SEK.`,
        subID: userId,
        pushData: {
          orderId: "new-container-order", 
          type: "container_booking_confirmed",
          paymentMethod: orderData.paymentMethod,
        },
      };

      const result =
        await nativeNotifyAPI.sendNotification(notificationPayload);
      if (result.success) {
        console.log(
          "Container order confirmation notification sent successfully"
        );
      }
    } catch (error) {
      console.error(
        "Error sending container order confirmation notification:",
        error
      );
    }
  }
}
