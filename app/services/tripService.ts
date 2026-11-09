/**
 * TripService — the single read path for scheduled departures.
 *
 * Trips are the existing `shippingSchedule` / `containerShippingSchedule`
 * documents in Sanity. This service adds no new data store and no new backend;
 * it only projects those documents into the normalised `Trip` model the UI uses.
 *
 * Drafts are excluded so unpublished schedule edits never reach the app.
 */
import { client } from "@/sanityClient";

import { getRoute } from "@/app/lib/routes";
import { zonedDateKey, zonedParts } from "@/app/lib/time";
import type {
  SwedenCollection,
  Trip,
  TripLocation,
  TripPoint,
  TripScope,
} from "@/app/lib/tripTypes";

const TRIP_PROJECTION = `{
  _id,
  _type,
  route,
  departureTime,
  status,
  vehicle,
  notes,
  capacity,
  availableCapacity,
  "summary": coalesce(summary, ""),
  "originOverride": coalesce(origin, ""),
  "destinationOverride": coalesce(destination, ""),
  "imageUrl": image.asset->url,
  "tunisiaLocations": tunisiaLocations[]{
    governorate,
    governorateKey,
    "available": coalesce(available, true),
    notes,
    "collectionPoints": collectionPoints[]{ name, address, notes },
    "deliveryPoints": deliveryPoints[]{ name, address, notes }
  },
  "swedenCollection": swedenCollection{
    postalInstructions,
    personalHandoverInstructions,
    notes
  }
}`;

const ALL_TRIPS_QUERY = `
*[_type in ["shippingSchedule", "containerShippingSchedule"]
  && defined(departureTime)
  && !(_id in path("drafts.**"))] | order(departureTime asc) ${TRIP_PROJECTION}
`;

const TRIP_BY_ID_QUERY = `
*[_id == $id && !(_id in path("drafts.**"))][0] ${TRIP_PROJECTION}
`;

/** Raw shape returned by the projection. */
type RawTrip = {
  _id: string;
  _type: string;
  route?: string;
  departureTime?: string;
  status?: string;
  vehicle?: string;
  notes?: string;
  summary?: string;
  capacity?: number;
  availableCapacity?: number;
  imageUrl?: string;
  originOverride?: string;
  destinationOverride?: string;
  tunisiaLocations?: TripLocation[];
  swedenCollection?: SwedenCollection;
};

function normalisePoint(point: TripPoint | null | undefined): TripPoint {
  return {
    name: point?.name ?? "",
    address: point?.address,
    notes: point?.notes,
  };
}

function normaliseLocation(location: TripLocation): TripLocation {
  return {
    governorate: location?.governorate ?? "",
    governorateKey:
      location?.governorateKey ??
      location?.governorate?.toLowerCase().replace(/\s+/g, "_") ??
      undefined,
    // Availability is per trip. A location served on one trip says nothing
    // about any other trip.
    available: location?.available !== false,
    collectionPoints: (location?.collectionPoints ?? []).map(normalisePoint),
    deliveryPoints: (location?.deliveryPoints ?? []).map(normalisePoint),
    notes: location?.notes,
  };
}

export function normaliseTrip(raw: RawTrip): Trip {
  const route = getRoute(raw.route);
  const departureDate = raw.departureTime ? new Date(raw.departureTime) : new Date();

  return {
    id: raw._id,
    kind: raw._type === "containerShippingSchedule" ? "container" : "shipping",
    routeValue: raw.route ?? "",
    route,
    departureTime: raw.departureTime ?? departureDate.toISOString(),
    departureDate,
    status: raw.status ?? "available",
    vehicle: raw.vehicle ?? "truck",
    notes: raw.notes,
    summary: raw.summary || undefined,
    capacity: raw.capacity,
    availableCapacity: raw.availableCapacity,
    imageUrl: raw.imageUrl,
    origin: raw.originOverride || route.origin,
    destination: raw.destinationOverride || route.destination,
    tunisiaLocations: (raw.tunisiaLocations ?? []).map(normaliseLocation),
    swedenCollection: raw.swedenCollection,
  };
}

/**
 * In-memory cache.
 *
 * Trips are read on nearly every screen, and a single screen mount can ask for
 * the same list twice. The cache keeps the app to one network round-trip per
 * change and is invalidated by `invalidateTrips()` after a pull-to-refresh or
 * a screen that knows schedules changed.
 */
let cache: { trips: Trip[]; fetchedAt: number } | null = null;
let inFlight: Promise<Trip[]> | null = null;

const CACHE_TTL_MS = 60_000;

/** Fetch every scheduled departure, newest-first for past and soonest-first for upcoming. */
export async function fetchAllTrips(): Promise<Trip[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.trips;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const raw = (await client.fetch(ALL_TRIPS_QUERY)) as RawTrip[] | null;
      const trips = (raw ?? []).map(normaliseTrip);
      cache = { trips, fetchedAt: Date.now() };
      return trips;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Force the next read to hit the network. */
export function invalidateTrips(): void {
  cache = null;
}

/**
 * Trips for a given scope.
 *
 * `upcoming` — departures that have not yet left.
 * `past` — departures that have already departed, most recent first.
 * `all` — every trip, upcoming first.
 */
export async function getTrips(scope: TripScope = "upcoming"): Promise<Trip[]> {
  const all = await fetchAllTrips();
  const now = Date.now();

  const upcoming = all.filter((t) => t.departureDate.getTime() >= now);
  const past = all
    .filter((t) => t.departureDate.getTime() < now)
    .sort((a, b) => b.departureDate.getTime() - a.departureDate.getTime());

  if (scope === "upcoming") return upcoming;
  if (scope === "past") return past;
  return [...upcoming, ...past];
}

/**
 * The next genuine upcoming departure.
 *
 * Returns `null` when nothing is scheduled — the UI then shows a designed
 * empty state rather than inventing a departure.
 */
export async function getNextDeparture(): Promise<Trip | null> {
  const upcoming = await getTrips("upcoming");
  return upcoming[0] ?? null;
}

/** The next upcoming departure in a given direction, if any. */
export async function getNextDepartureForDirection(
  direction: "se_to_tn" | "tn_to_se",
): Promise<Trip | null> {
  const upcoming = await getTrips("upcoming");
  return upcoming.find((t) => t.route.direction === direction) ?? null;
}

/**
 * Trips departing on a specific calendar day.
 *
 * The day is evaluated in the **origin's** timezone so a late-night departure
 * never lands on the neighbouring day.
 */
export async function getTripsForDate(
  dateKey: string,
  timeZone?: string,
): Promise<Trip[]> {
  const all = await fetchAllTrips();
  const zone = (timeZone ?? all[0]?.route.timezone ?? "Europe/Stockholm") as
    | "Europe/Stockholm"
    | "Africa/Tunis";

  return all.filter((trip) => {
    const p = new Date(trip.departureTime);
    return zonedKey(p, zone) === dateKey;
  });
}

/** Trips departing within a calendar month (used to mark calendar days). */
export async function getTripsForMonth(
  year: number,
  month: number,
): Promise<Trip[]> {
  const all = await fetchAllTrips();
  return all.filter((trip) => {
    const parts = zonedKeyParts(trip.departureDate, trip.route.timezone);
    return parts.year === year && parts.month === month;
  });
}

/** A single trip by id. */
export async function getTrip(id: string): Promise<Trip | null> {
  try {
    const raw = (await client.fetch(TRIP_BY_ID_QUERY, { id })) as RawTrip | null;
    return raw ? normaliseTrip(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Calendar-day keys that have at least one departure, for the given month.
 */
export async function getDepartureDayKeys(
  year: number,
  month: number,
): Promise<string[]> {
  const trips = await getTripsForMonth(year, month);
  const keys = new Set<string>();
  for (const trip of trips) {
    keys.add(zonedKey(trip.departureDate, trip.route.timezone));
  }
  return Array.from(keys);
}

// Local helpers that cast the route timezone to the two supported zones.
function zonedKey(date: Date, timeZone: string): string {
  return zonedDateKey(date, timeZone as "Europe/Stockholm" | "Africa/Tunis");
}

function zonedKeyParts(date: Date, timeZone: string) {
  return zonedParts(date, timeZone as "Europe/Stockholm" | "Africa/Tunis");
}
