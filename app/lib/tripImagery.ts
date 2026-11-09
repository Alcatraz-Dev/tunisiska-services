/**
 * Scene photography for departures.
 *
 * These photographs are *scenery* for a destination, not a record of a specific
 * departure: the reference uses large transport imagery to establish place, and
 * the schedule itself carries no photographs of its own.
 *
 * Order of preference in the card is therefore:
 *   1. `trip.imageUrl` — an image an administrator attached to that schedule.
 *   2. The scene photograph for the destination country, picked deterministically
 *      so a list does not repeat the same frame card after card.
 *   3. `TransportArt` — branded vector artwork, if the network image fails.
 *
 * No date, status or location shown to the user is derived from these images.
 */

export type SceneImage = {
  uri: string;
  /** Scene description for assistive technology — never a trip claim. */
  description: string;
};

const PEXELS = (path: string, width = 900) =>
  `https://images.pexels.com/photos/${path}/pexels-photo-${path}.jpeg?auto=compress&cs=tinysrgb&w=${width}&q=80`;

const UNSPLASH = (path: string, width = 900) =>
  `https://images.unsplash.com/${path}?auto=format&w=${width}&q=80&fit=crop`;

/** Stockholm waterfront — the Swedish side of the route. */
export const SWEDEN_SCENES: SceneImage[] = [
  {
    uri: PEXELS("14388969"),
    description:
      "Stockholm waterfront with moored boats, photo by Paul G on Pexels",
  },
  {
    uri: UNSPLASH("photo-1560089168-6516081f5bf1"),
    description:
      "Stockholm skyline across the water, photo by Yoko Correia Nishimiya on Unsplash",
  },
];

/** Tunisian coast — the Tunisian side of the route. */
export const TUNISIA_SCENES: SceneImage[] = [
  {
    uri: PEXELS("35259226"),
    description:
      "White and blue houses above the sea in Tunisia, photo by wael belkahla on Pexels",
  },
  {
    uri: UNSPLASH("photo-1633936478473-e75c1252cccf"),
    description:
      "View over the sea from Sidi Bou Said, photo by Halima Bouchouicha on Unsplash",
  },
];

/** Road freight — used when a route resolves to neither country. */
export const ROAD_SCENES: SceneImage[] = [
  {
    uri: PEXELS("40292013"),
    description:
      "White semi truck on the road, photo by R9 Media Photo Collective on Pexels",
  },
];

/**
 * Transport operations — the same frames everywhere a vehicle/service is shown.
 *
 * Shared by the home hero rotation and the trip-details fallback so transport
 * services always show the same photography.
 */
export const TRANSPORT_SCENES: SceneImage[] = [
  {
    uri: PEXELS("4483610"),
    description: "Freight parcels ready for transport, photo on Pexels",
  },
  {
    uri: PEXELS("40292013"),
    description:
      "White semi truck on the road, photo by R9 Media Photo Collective on Pexels",
  },
  {
    uri: PEXELS("2226458"),
    description: "Cargo containers stacked at port, photo on Pexels",
  },
];

/** Home hero rotation: Sweden, Tunisia, then the shared transport frames. */
export const HERO_SLIDES: SceneImage[] = [
  ...SWEDEN_SCENES,
  ...TUNISIA_SCENES,
  ...TRANSPORT_SCENES,
];

/**
 * Every frame a trip hero may cycle through.
 *
 * Sweden-bound trips cycle Sweden frames, Tunisia-bound cycle Tunisia frames,
 * anything else cycles the shared transport frames — so each country keeps
 * its own look while transport services stay consistent.
 */
export function slidesForTrip(trip: {
  id: string;
  routeValue: string;
  destinationCountry?: "SE" | "TN";
}): SceneImage[] {
  if (trip.destinationCountry === "TN") return TUNISIA_SCENES;
  if (trip.destinationCountry === "SE") return SWEDEN_SCENES;
  return TRANSPORT_SCENES;
}

/** Stable small hash so the same departure always gets the same frame. */
function hash(value: string): number {
  let total = 0;
  for (let i = 0; i < value.length; i += 1) {
    total = (total + value.charCodeAt(i) * (i + 1)) % 9973;
  }
  return total;
}

/**
 * The scene photograph for a departure.
 *
 * Chosen from the destination country, varied by the trip's identity.
 */
export function sceneForTrip(trip: {
  id: string;
  routeValue: string;
  destinationCountry?: "SE" | "TN";
}): SceneImage {
  const scenes =
    trip.destinationCountry === "TN"
      ? TUNISIA_SCENES
      : trip.destinationCountry === "SE"
        ? SWEDEN_SCENES
        : ROAD_SCENES;

  return scenes[hash(`${trip.routeValue}:${trip.id}`) % scenes.length];
}
