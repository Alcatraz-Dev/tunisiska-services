import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * The native Live Activity bridge.
 *
 * The module is only present in a build that includes the widget extension.
 * Optional lookup lets Expo Go and other builds without it load the app
 * normally; the facade in `app/lib/liveActivity.ts` then degrades gracefully.
 */
export type TunisiskaLiveActivityModule = {
  /** Whether the device supports Live Activities. */
  areActivitiesEnabled?(): Promise<boolean>;
  /** Start (or replace) the Live Activity for a departure. */
  start?(
    tripId: string,
    routeLabel: string,
    origin: string,
    destination: string,
    vehicle: string,
    language: string,
    status: string,
    timeZoneIdentifier: string,
    /** Departure time as a millisecond epoch. */
    departureDate: number,
    capacity: number,
    available: number,
  ): Promise<string | null>;
  /** Update a running activity. */
  update?(
    id: string,
    status: string,
    departureDate: number,
    capacity: number,
    available: number,
  ): Promise<boolean>;
  /** End a running activity. */
  end?(id: string): Promise<boolean>;
  /** Identifiers of the running activities. */
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
  /** End every running activity. */
  endAll?(): Promise<boolean>;
  /** Publish the current departure for the iOS home-screen widget. */
  updateTripWidget(payload: string, language: string): Promise<boolean>;
};

export default requireOptionalNativeModule<TunisiskaLiveActivityModule>(
  "TunisiskaLiveActivity",
);
