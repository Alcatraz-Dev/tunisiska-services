/**
 * Trip domain types.
 *
 * A normalised view over the two schedule document types
 * (`shippingSchedule` and `containerShippingSchedule`), so the UI never has to
 * care which one it received.
 */
import type { RouteDefinition } from "@/app/lib/routes";

/** A Tunisian collection/delivery location attached to one specific trip. */
export type TripLocation = {
  governorate: string;
  /** Stable key used for selection and matching. */
  governorateKey?: string;
  /** Whether this governorate is actually served on this trip. */
  available: boolean;
  collectionPoints: TripPoint[];
  deliveryPoints: TripPoint[];
  notes?: string;
};

export type TripPoint = {
  name: string;
  address?: string;
  notes?: string;
};

/** Stockholm-side collection and handover instructions for one trip. */
export type SwedenCollection = {
  /** Postal service collection instruction. */
  postalInstructions?: string;
  /** Personal handover instruction. */
  personalHandoverInstructions?: string;
  notes?: string;
};

export type Trip = {
  id: string;
  /** Which schedule collection the trip came from. */
  kind: "shipping" | "container";
  /** Raw stored route value. */
  routeValue: string;
  /** Resolved route definition (origin, destination, timezone, labels). */
  route: RouteDefinition;
  /** ISO instant of departure. */
  departureTime: string;
  departureDate: Date;
  /** Raw status from the CMS. */
  status: string;
  vehicle: string;
  notes?: string;
  summary?: string;
  capacity?: number;
  availableCapacity?: number;
  /** Approved transport photograph for this trip. */
  imageUrl?: string;
  /** Origin override, when an administrator sets one explicitly. */
  origin: string;
  /** Destination override, when an administrator sets one explicitly. */
  destination: string;
  /** Tunisian governorates served by **this** trip. */
  tunisiaLocations: TripLocation[];
  /** Stockholm collection instructions for **this** trip. */
  swedenCollection?: SwedenCollection;
};

export type TripScope = "upcoming" | "past" | "all";
