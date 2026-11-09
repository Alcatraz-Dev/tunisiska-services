import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import {
  listRunningActivities,
  publishNextDepartureWidget,
  syncNextDepartureActivity,
} from "@/app/lib/liveActivity";
import type { Trip } from "@/app/lib/tripTypes";
import { useLanguage } from "@/app/hooks/useLanguage";

/**
 * Keeps the Live Activity in step with the next genuine departure.
 *
 * • Starts an activity when there is an upcoming departure.
 * • Replaces it when a different departure becomes the next one.
 * • Ends it when there is no upcoming departure any more.
 *
 * The widget snapshot is republished on every mount and every return to the
 * foreground — the Home Screen widget must never show a stale departure, which
 * is exactly what happened when publishing was gated on the trip signature.
 * ActivityKit (the Lock Screen card and the Dynamic Island) is only asked to
 * start or update when the tracked departure actually changed.
 */
export function useLiveActivitySync(trip: Trip | null, enabled = true) {
  const { language } = useLanguage();
  const trackedId = useRef<string | null>(null);
  const syncing = useRef(false);

  useEffect(() => {
    if (!enabled || (Platform.OS !== "ios" && Platform.OS !== "android")) return;

    let cancelled = false;

    const sync = async () => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        const tripId = trip
          ? `${trip.id}:${trip.departureDate.getTime()}:${trip.capacity ?? 0}:${trip.availableCapacity ?? trip.capacity ?? 0}:${trip.status ?? "available"}:${trip.routeValue}:${trip.origin}:${trip.destination}:${trip.vehicle}:${language}`
          : null;

        // Always refresh the home-screen widget, even when the departure is
        // unchanged: the countdown and "departing soon" state move with time.
        await publishNextDepartureWidget(trip);

        if (Platform.OS !== "ios") {
          if (!cancelled) trackedId.current = tripId;
          return;
        }

        const running = await listRunningActivities();
        if (tripId === trackedId.current && (tripId !== null || running.length === 0)) return;
        await syncNextDepartureActivity(trip);
        if (!cancelled) trackedId.current = tripId;
      } catch (error) {
        console.warn("Live Activity sync failed:", error);
      } finally {
        syncing.current = false;
      }
    };

    sync();

    // Re-sync when the app returns to the foreground: the departure may have
    // changed while the app was in the background.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        sync();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [trip, enabled, language]);
}
