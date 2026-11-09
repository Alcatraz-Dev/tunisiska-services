/**
 * Data hooks for the redesigned screens.
 *
 * Each hook owns exactly one network read, exposes loading / error / data
 * states, and never blocks the screen from rendering. Skeletons are driven by
 * the `loading` flag; errors surface a designed retry state.
 */
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

import {
  fetchAllTrips,
  getNextDeparture,
  getTrips,
  invalidateTrips,
} from "@/app/services/tripService";
import {
  getAnnouncements,
  type Announcement,
} from "@/app/services/announcementService";
import type { Trip, TripScope } from "@/app/lib/tripTypes";

type AsyncState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

/** Trips for a given scope, refreshed whenever the screen regains focus. */
export function useTrips(scope: TripScope = "upcoming") {
  const [state, setState] = useState<AsyncState<Trip[]>>({
    data: [],
    loading: true,
    error: null,
  });

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const trips = await getTrips(scope);
        setState({ data: trips, loading: false, error: null });
      } catch (error: any) {
        setState((s) => ({
          ...s,
          loading: false,
          error: error?.message ?? "Kunde inte hämta avgångarna",
        }));
      }
    },
    [scope],
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    invalidateTrips();
    await load(true);
  }, [load]);

  return { ...state, refresh };
}

/** The next genuine upcoming departure. */
export function useNextDeparture() {
  const [state, setState] = useState<AsyncState<Trip | null>>({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const trip = await getNextDeparture();
      setState({ data: trip, loading: false, error: null });
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error?.message ?? "Kunde inte hämta avgången",
      });
    }
  }, []);

  useEffect(() => {
    load();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") load();
    });
    return () => subscription.remove();
  }, [load]);

  return { ...state, refresh: load };
}

/**
 * The next departure for each direction, used by the Home direction cards so
 * each card can show whether a departure actually exists in that direction.
 */
export function useDirectionDepartures() {
  const [state, setState] = useState<AsyncState<{
    se_to_tn: Trip | null;
    tn_to_se: Trip | null;
  }>>({
    data: { se_to_tn: null, tn_to_se: null },
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    try {
      const all = await fetchAllTrips();
      const now = Date.now();
      const upcoming = all.filter((t) => t.departureDate.getTime() >= now);
      setState({
        data: {
          se_to_tn: upcoming.find((t) => t.route.direction === "se_to_tn") ?? null,
          tn_to_se: upcoming.find((t) => t.route.direction === "tn_to_se") ?? null,
        },
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: error?.message ?? "Kunde inte hämta avgångarna",
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}

/** Published announcements, newest first. */
export function useAnnouncements(limit?: number) {
  const [state, setState] = useState<AsyncState<Announcement[]>>({
    data: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const all = await getAnnouncements();
      setState({
        data: typeof limit === "number" ? all.slice(0, limit) : all,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: error?.message ?? "Kunde inte hämta nyheter",
      }));
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}

/**
 * Reload a value every time the screen comes into focus.
 *
 * Used by screens that show data which changes elsewhere in the app — for
 * example a trip's status after an administrator edits it.
 */
export function useRefreshOnFocus(callback: () => void | Promise<void>) {
  useFocusEffect(
    useCallback(() => {
      callback();
    }, [callback]),
  );
}
