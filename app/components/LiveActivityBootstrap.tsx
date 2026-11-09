import { useNextDeparture } from "@/app/hooks/useAppData";
import { useLiveActivitySync } from "@/app/hooks/useLiveActivitySync";

/**
 * Starts the Live Activity and publishes the Home Screen widget snapshot.
 *
 * This lives at the app root rather than on one screen. A Live Activity can only
 * appear in the Dynamic Island while it is actually running, and the widgets
 * only show real data once a snapshot has been published — both must therefore
 * happen no matter which screen the customer lands on, or a customer who never
 * opens Home would see an island that never appears and a widget stuck on its
 * empty state.
 */
export default function LiveActivityBootstrap() {
  const { data: trip, loading, error } = useNextDeparture();

  useLiveActivitySync(trip ?? null, !loading && !error);

  return null;
}
