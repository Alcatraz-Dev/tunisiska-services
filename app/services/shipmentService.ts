/**
 * Shipment tracking data.
 *
 * Reads the user's own `shippingOrder` documents from Sanity, filtered by the
 * signed-in Clerk id. The stage shown is derived from the order's real
 * `status` field — no stage is ever assumed or faked.
 */
import { client } from "@/sanityClient";
import { getRoute } from "@/app/lib/routes";

export type Shipment = {
  id: string;
  status: string;
  trackingNumber?: string;
  customerName?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  routeValue?: string;
  scheduledDateTime?: string;
  serviceType?: string;
  packageDescription?: string;
  weight?: number;
  totalPrice?: number;
  createdAt?: string;
};

const PROJECTION = `{
  _id,
  status,
  trackingNumber,
  "customerName": customerInfo.name,
  pickupAddress,
  deliveryAddress,
  route,
  scheduledDateTime,
  serviceType,
  "packageDescription": packageDetails.description,
  "weight": packageDetails.weight,
  totalPrice,
  createdAt
}`;

export async function getMyShipments(userId: string): Promise<Shipment[]> {
  try {
    const raw = await client.fetch(
      `*[_type == "shippingOrder" && userId == $userId] | order(createdAt desc) ${PROJECTION}`,
      { userId },
    );
    return (raw ?? []) as Shipment[];
  } catch (error) {
    console.error("Failed to load shipments:", error);
    return [];
  }
}

export async function getShipmentByTrackingNumber(
  trackingOrId: string,
): Promise<Shipment | null> {
  const code = trackingOrId.trim();
  if (!code) return null;
  try {
    const raw = await client.fetch(
      `*[_type == "shippingOrder" && (trackingNumber == $code || _id == $code)][0] ${PROJECTION}`,
      { code },
    );
    return (raw ?? null) as Shipment | null;
  } catch (error) {
    console.error("Failed to lookup shipment by code:", error);
    return null;
  }
}

/** The four real stages a shipment passes through. */
export const SHIPMENT_STAGES = [
  { key: "pending", label: "Booked", status: "pending" },
  { key: "confirmed", label: "Picked up", status: "confirmed" },
  { key: "in_progress", label: "In transit", status: "in_progress" },
  { key: "completed", label: "Delivered", status: "completed" },
] as const;

/**
 * Index of the stage a shipment has reached.
 *
 * `-1` means the shipment has been cancelled.
 */
export function stageIndexFor(status?: string): number {
  if (!status || status === "cancelled") return -1;
  const index = SHIPMENT_STAGES.findIndex((s) => s.status === status);
  return index === -1 ? 0 : index;
}

/** Human label for a status. */
export function statusLabel(status?: string): string {
  const stage = SHIPMENT_STAGES.find((s) => s.status === status);
  if (stage) return stage.label;
  if (status === "cancelled") return "Cancelled";
  return "Booked";
}

/** Origin and destination for a shipment, derived from its stored route. */
export function shipmentRoute(shipment: Shipment): {
  origin: string;
  destination: string;
  directionLabel: string;
} {
  const route = getRoute(shipment.routeValue);
  return {
    origin: route.origin,
    destination: route.destination,
    directionLabel: route.directionLabel,
  };
}
