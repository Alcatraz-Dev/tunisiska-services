import { Platform } from "react-native";
import { ActivityIndicator, Platform as RNPlatform } from "react-native";

import type { Trip } from "@/app/lib/tripTypes";
import { formatDepartureLabel, formatVehicle } from "@/app/lib/tripFormat";
import { useLanguageStore } from "@/app/hooks/useLanguage";

/**
 * Live Activity facade.
 *
 * Wraps the native ActivityKit bridge so the app can ask for a Live Activity
 * without caring whether the platform supports one.
 *
 * A Live Activity is available **only** when all of the following hold:
 *   • the platform is iOS,
 *   • the OS is iOS 16.2 or newer,
 *   • the build includes the widget extension (a development build, never Expo Go),
 *   • the user has not disabled Live Activities in Settings.
 *
 * Everywhere else the app falls back to the in-app departure card and native
 * notifications. The Dynamic Island is never simulated inside React Native.
 */

/** Minimum iOS version that supports the ActivityKit APIs used here. */
export const MINIMUM_IOS_VERSION = "16.2";

type NativeBridge = {
  areActivitiesEnabled?(): Promise<boolean>;
  start?(
    tripId: string,
    routeLabel: string,
    origin: string,
    destination: string,
    vehicle: string,
    language: string,
    status: string,
    timeZoneIdentifier: string,
    departureDate: number,
    capacity: number,
    available: number,
  ): Promise<string | null>;
  update?(
    id: string,
    status: string,
    departureDate: number,
    capacity: number,
    available: number,
  ): Promise<boolean>;
  end?(id: string): Promise<boolean>;
  listRunning?(): Promise<Array<{
    id: string;
    tripId: string;
    language: string;
    routeLabel: string;
    origin: string;
    destination: string;
    vehicle: string;
    timeZoneIdentifier: string;
  }>>;
  endAll?(): Promise<boolean>;
  updateTripWidget?(payload: string, language: string): Promise<boolean>;
};

let bridge: NativeBridge | null = null;
let bridgeResolved = false;

function localizedCity(city: string, language: string) {
  if (language !== "ar") return city;
  const arabicCities: Record<string, string> = {
    Stockholm: "استوكهولم",
    Tunis: "تونس",
    Sousse: "سوسة",
    Sfax: "صفاقس",
  };
  return arabicCities[city] ?? city;
}

/**
 * The display state the widgets and the Live Activity render.
 *
 * The CMS status only says whether a departure is bookable; the countdown is
 * what makes a widget useful, so "departing soon" is derived from the clock and
 * the raw CMS values are normalised onto one vocabulary per platform.
 */
export function displayStatus(trip: Trip): "scheduled" | "departing_soon" | "full" | "cancelled" | "departed" {
  const raw = (trip.status ?? "").toLowerCase();
  if (raw.includes("cancel")) return "cancelled";
  if (raw.includes("depart") || raw.includes("complet")) return "departed";
  if (["full", "sold_out", "unavailable"].includes(raw)) return "full";

  const remaining = trip.departureDate.getTime() - Date.now();
  if (remaining <= 0) return "departed";
  if (remaining <= 60 * 60 * 1000) return "departing_soon";
  return "scheduled";
}

function localizedRouteLabel(trip: Trip, language: string) {
  const sweden = language === "ar" ? "السويد" : language === "sv" ? "Sverige" : "Sweden";
  const tunisia = language === "ar" ? "تونس" : language === "sv" ? "Tunisien" : "Tunisia";
  return trip.route.directionLabel.startsWith("Sweden")
    ? `${sweden} → ${tunisia}`
    : `${tunisia} → ${sweden}`;
}

/**
 * Resolve the native module.
 *
 * `requireNativeModule` throws when the module is absent — which is the case
 * in Expo Go and in any build made without the widget extension. The failure
 * is expected and is handled rather than propagated.
 */
function getBridge(): NativeBridge | null {
  if (bridgeResolved) return bridge;
  bridgeResolved = true;

  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    bridge = null;
    return bridge;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require("tunisiska-live-activity");
    const candidate = module?.default ?? module;
    // The package is present in the JS bundle even when its native module is
    // not linked (for example in Expo Go). Its default export is then null.
    if (!candidate || typeof candidate.updateTripWidget !== "function") {
      bridge = null;
      return bridge;
    }
    bridge = candidate as NativeBridge;
  } catch {
    bridge = null;
  }

  return bridge;
}

/** Whether this device can show Live Activities right now. */
export async function areActivitiesEnabled(): Promise<boolean> {
  const native = getBridge();
  if (!native?.areActivitiesEnabled) return false;
  try {
    return await native.areActivitiesEnabled();
  } catch {
    return false;
  }
}

/** The identifiers of the Live Activities currently running. */
export async function listRunningActivities(): Promise<Array<{
  id: string;
  tripId: string;
  language: string;
  routeLabel: string;
  origin: string;
  destination: string;
  vehicle: string;
  timeZoneIdentifier: string;
}>> {
  const native = getBridge();
  if (!native?.listRunning) return [];
  try {
    return await native.listRunning();
  } catch {
    return [];
  }
}

/**
 * Start a Live Activity for a departure.
 *
 * Returns the activity identifier, or `null` when Live Activities are not
 * available. Calling this twice replaces the previous activity rather than
 * stacking two.
 */
export async function startNextDepartureActivity(
  trip: Trip,
): Promise<string | null> {
  const native = getBridge();
  if (!native?.start) return null;

  try {
    const language = useLanguageStore.getState().language;
    return await native.start(
      trip.id,
      localizedRouteLabel(trip, language),
      localizedCity(trip.origin, language),
      localizedCity(trip.destination, language),
      trip.vehicle,
      language,
      displayStatus(trip),
      trip.route.timezone,
      trip.departureDate.getTime(),
      trip.capacity ?? 0,
      trip.availableCapacity ?? trip.capacity ?? 0,
    );
  } catch (error) {
    console.warn("Could not start the Live Activity:", error);
    return null;
  }
}

/** Update a running Live Activity, e.g. when the departure status changes. */
export async function updateNextDepartureActivity(
  id: string,
  trip: Trip,
  status: string,
): Promise<boolean> {
  const native = getBridge();
  if (!native?.update) return false;

  try {
    return await native.update(
      id,
      status,
      trip.departureDate.getTime(),
      trip.capacity ?? 0,
      trip.availableCapacity ?? trip.capacity ?? 0,
    );
  } catch {
    return false;
  }
}

/** End a running Live Activity. */
export async function endNextDepartureActivity(id: string): Promise<boolean> {
  const native = getBridge();
  if (!native?.end) return false;

  try {
    return await native.end(id);
  } catch {
    return false;
  }
}

/** End every running Live Activity. */
export async function endAllActivities(): Promise<boolean> {
  const native = getBridge();
  if (!native?.endAll) return false;

  try {
    return await native.endAll();
  } catch {
    return false;
  }
}

/**
 * Publish the departure snapshot the Home Screen widgets read.
 *
 * Both platforms use this: iOS stores it in the shared App Group, Android in
 * SharedPreferences. It is a cache refresh, so a failure is reported rather
 * than thrown.
 */
export async function publishNextDepartureWidget(
  trip: Trip | null,
): Promise<boolean> {
  const native = getBridge();
  if (!native?.updateTripWidget) return false;

  try {
    return await publishSnapshot(native, trip);
  } catch (error) {
    // A formatting failure must never leave the widget on an old departure.
    console.warn("Could not publish the departure widget:", error);
    return false;
  }
}

async function publishSnapshot(
  native: NativeBridge,
  trip: Trip | null,
): Promise<boolean> {
  if (!native.updateTripWidget) return false;
  const language = useLanguageStore.getState().language;
  const origin = trip ? localizedCity(trip.origin, language) : "";
  const destination = trip ? localizedCity(trip.destination, language) : "";
  const vehicleLabel =
    language === "ar"
      ? (({ truck: "شاحنة", cargo_van: "شاحنة صغيرة", container_ship: "سفينة حاويات", air_freight: "شحن جوي" } as Record<string, string>)[trip?.vehicle ?? ""] ?? "وسيلة النقل")
      : language === "sv"
        ? (({ truck: "Lastbil", cargo_van: "Skåpbil", container_ship: "Containerskepp", air_freight: "Flygfrakt" } as Record<string, string>)[trip?.vehicle ?? ""] ?? "Transport")
        : formatVehicle(trip?.vehicle);

  const payload = trip
    ? JSON.stringify({
        tripId: trip.id,
        route: `${origin} → ${destination}`,
        origin,
        destination,
        vehicle: vehicleLabel,
        date: trip.departureDate.getTime(),
        language,
        capacity: trip.capacity ?? 0,
        available: trip.availableCapacity ?? trip.capacity ?? 0,
        status: displayStatus(trip),
        timeZoneIdentifier: trip.route.timezone,
      })
    : "";

  try {
    return await native.updateTripWidget(payload, language);
  } catch {
    return false;
  }
}

/**
 * Keep the Live Activity in step with the next genuine departure.
 *
 * • Starts an activity when there is an upcoming departure and none is running.
 * • Updates the running activity when the tracked departure changes.
 * • Ends the activity when there is no upcoming departure any more.
 */
export async function syncNextDepartureActivity(
  trip: Trip | null,
): Promise<void> {
  const native = getBridge();
  if (!native?.updateTripWidget) return;

  const language = useLanguageStore.getState().language;
  const origin = trip ? localizedCity(trip.origin, language) : "";
  const destination = trip ? localizedCity(trip.destination, language) : "";

  await publishNextDepartureWidget(trip);

  if (Platform.OS !== "ios") return;

  const running = await listRunningActivities();

  if (!trip) {
    if (running.length > 0) await endAllActivities();
    return;
  }

  const enabled = await areActivitiesEnabled();
  if (!enabled) return;

  const matching = running.find((activity) =>
    activity.tripId === trip.id &&
    activity.language === language &&
    activity.routeLabel === localizedRouteLabel(trip, language) &&
    activity.origin === origin &&
    activity.destination === destination &&
    activity.vehicle === trip.vehicle &&
    activity.timeZoneIdentifier === trip.route.timezone,
  );
  if (matching) {
    await updateNextDepartureActivity(matching.id, trip, displayStatus(trip));
    for (const activity of running) {
      if (activity.id !== matching.id) await endNextDepartureActivity(activity.id);
    }
    return;
  }

  // Start replaces any old activity so the island always tracks one trip.
  await startNextDepartureActivity(trip);
}

/**
 * A human description of the departure, used by the Live Activity's
 * accessibility label and by in-app fallback messaging.
 */
export function describeDeparture(trip: Trip): string {
  return `${trip.route.directionLabel} · ${formatDepartureLabel(trip)}`;
}
