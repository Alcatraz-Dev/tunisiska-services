/**
 * Route metrics.
 *
 * The map draws a real departure, so the distance and duration it reports must
 * come from that departure's own route — never from a hardcoded demo path.
 *
 * Distance is the great-circle distance between the two served cities, computed
 * from their coordinates. Duration is that distance at a documented average
 * speed for the vehicle serving the trip, which makes the figure honest and
 * reproducible rather than a number pulled out of the air.
 */
import { getRoute } from "@/app/lib/routes";

export type LatLng = { latitude: number; longitude: number };

/** Coordinates of the cities the company actually serves. */
export const CITY_COORDINATES: Record<string, LatLng> = {
  stockholm: { latitude: 59.3293, longitude: 18.0686 },
  goteborg: { latitude: 57.7089, longitude: 11.9746 },
  malmo: { latitude: 55.605, longitude: 13.0038 },
  tunis: { latitude: 36.8065, longitude: 10.1815 },
  sousse: { latitude: 35.8256, longitude: 10.6411 },
  sfax: { latitude: 34.7406, longitude: 10.7603 },
};

/**
 * Average door-to-door speed per vehicle, in km/h.
 *
 * These are operating averages (loading, customs, ferry legs and rest stops
 * included), not top speeds, so the reported duration is a usable estimate.
 */
const AVERAGE_SPEED_KMH: Record<string, number> = {
  truck: 55,
  cargo_van: 60,
  container_ship: 30,
  air_freight: 650,
};

const DEFAULT_SPEED_KMH = 55;
const EARTH_RADIUS_KM = 6371;

/** Normalise a city name for coordinate lookup (`Göteborg` → `goteborg`). */
export function cityKey(city: string): string {
  return city
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z]/g, "");
}

export function coordinatesForCity(city?: string | null): LatLng | null {
  if (!city) return null;
  return CITY_COORDINATES[cityKey(city)] ?? null;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type RouteMetrics = {
  from: LatLng | null;
  to: LatLng | null;
  /** Great-circle distance, rounded to whole kilometres. */
  distanceKm: number | null;
  /** Estimated transit time in hours at the vehicle's average speed. */
  durationHours: number | null;
  /** The speed the estimate assumed, so the UI can explain itself. */
  speedKmh: number;
};

/**
 * Metrics for a stored trip: its route value picks the two cities, its vehicle
 * picks the speed.
 */
export function getRouteMetrics(
  routeValue?: string | null,
  vehicle?: string | null,
): RouteMetrics {
  const route = getRoute(routeValue);
  const from = coordinatesForCity(route.origin);
  const to = coordinatesForCity(route.destination);
  const speedKmh = AVERAGE_SPEED_KMH[vehicle ?? ""] ?? DEFAULT_SPEED_KMH;

  if (!from || !to) {
    return { from, to, distanceKm: null, durationHours: null, speedKmh };
  }

  const distanceKm = Math.round(haversineKm(from, to));
  const durationHours = distanceKm / speedKmh;

  return { from, to, distanceKm, durationHours, speedKmh };
}

/**
 * Straight-line path between two points, used when a road route cannot be
 * fetched (no API key, offline). Interpolated so the marker sits on the line
 * and the polyline still renders as a curve rather than two endpoints.
 */
export function interpolatePath(
  from: LatLng,
  to: LatLng,
  steps = 32,
): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({
      latitude: from.latitude + (to.latitude - from.latitude) * t,
      longitude: from.longitude + (to.longitude - from.longitude) * t,
    });
  }
  return points;
}

/** `2 310 km` — grouped per locale, no unit translation needed. */
export function formatDistanceKm(
  km: number | null,
  locale: string,
): string | null {
  if (km === null || Number.isNaN(km)) return null;
  return `${new Intl.NumberFormat(locale).format(km)} km`;
}

/** `2 d 5 h`, `5 h 20 min`, `45 min`. */
export function formatDuration(hours: number | null): string | null {
  if (hours === null || !Number.isFinite(hours) || hours <= 0) return null;

  const totalMinutes = Math.round(hours * 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const restHours = Math.floor((totalMinutes - days * 60 * 24) / 60);
  const minutes = totalMinutes - days * 60 * 24 - restHours * 60;

  if (days > 0) return `${days} d ${restHours} h`;
  if (restHours > 0) return minutes > 0 ? `${restHours} h ${minutes} min` : `${restHours} h`;
  return `${minutes} min`;
}
