/**
 * Route registry.
 *
 * The single place that maps a stored `route` value onto its presentation and
 * operational meaning. Everything else in the app reads from here, so a route
 * can never be interpreted two different ways.
 *
 * Only the locations the company actually serves appear here: Stockholm on the
 * Swedish side, and Tunis / Sousse / Sfax on the Tunisian side. No city is
 * invented.
 */

export type CountryCode = "SE" | "TN";

/** IANA timezone for departures originating in Sweden. */
export const SWEDEN_TIMEZONE = "Europe/Stockholm";

/** IANA timezone for departures originating in Tunisia. */
export const TUNISIA_TIMEZONE = "Africa/Tunis";

export type RouteDefinition = {
  /** Stored value in Sanity (`shippingSchedule.route`). */
  value: string;
  /** Direction group — drives the "Sweden → Tunisia" family of cards. */
  direction: "se_to_tn" | "tn_to_se";
  /** Origin city. */
  origin: string;
  /** Destination city. */
  destination: string;
  /** Country of origin. */
  originCountry: CountryCode;
  /** Country of destination. */
  destinationCountry: CountryCode;
  /** IANA timezone of the departure. */
  timezone: string;
  /** Label shown on cards, e.g. "Stockholm → Tunis". */
  label: string;
  /** Short direction label, e.g. "Sweden → Tunisia". */
  directionLabel: string;
  /** Vehicle types that can serve this route. */
  vehicles: string[];
};

/** Route values as stored by administrators in Sanity. */
export const ROUTE_VALUES = {
  stockholmToTunis: "stockholm_tunis",
  tunisToStockholm: "tunis_stockholm",
  tunisToSousse: "tunis_sousse",
  tunisToSfax: "tunis_sfax",
} as const;

const SWEDEN_LABEL = "Sweden";
const TUNISIA_LABEL = "Tunisia";

export const ROUTES: RouteDefinition[] = [
  {
    value: ROUTE_VALUES.stockholmToTunis,
    direction: "se_to_tn",
    origin: "Stockholm",
    destination: "Tunis",
    originCountry: "SE",
    destinationCountry: "TN",
    timezone: "Europe/Stockholm",
    label: "Stockholm → Tunis",
    directionLabel: `${SWEDEN_LABEL} → ${TUNISIA_LABEL}`,
    vehicles: ["truck", "cargo_van", "air_freight"],
  },
  {
    value: ROUTE_VALUES.tunisToStockholm,
    direction: "tn_to_se",
    origin: "Tunis",
    destination: "Stockholm",
    originCountry: "TN",
    destinationCountry: "SE",
    timezone: "Africa/Tunis",
    label: "Tunis → Stockholm",
    directionLabel: `${TUNISIA_LABEL} → ${SWEDEN_LABEL}`,
    vehicles: ["truck", "cargo_van", "air_freight"],
  },
  {
    value: ROUTE_VALUES.tunisToSousse,
    direction: "tn_to_se",
    origin: "Sousse",
    destination: "Stockholm",
    originCountry: "TN",
    destinationCountry: "SE",
    timezone: "Africa/Tunis",
    label: "Sousse → Stockholm",
    directionLabel: `${TUNISIA_LABEL} → ${SWEDEN_LABEL}`,
    vehicles: ["truck", "cargo_van"],
  },
  {
    value: ROUTE_VALUES.tunisToSfax,
    direction: "tn_to_se",
    origin: "Sfax",
    destination: "Stockholm",
    originCountry: "TN",
    destinationCountry: "SE",
    timezone: "Africa/Tunis",
    label: "Sfax → Stockholm",
    directionLabel: `${TUNISIA_LABEL} → ${SWEDEN_LABEL}`,
    vehicles: ["truck", "cargo_van"],
  },
];

const routeIndex = new Map(ROUTES.map((r) => [r.value, r]));

/** Look up a route definition. Falls back to a safe generic definition. */
export function getRoute(value?: string | null): RouteDefinition {
  if (!value) return ROUTES[0];
  return (
    routeIndex.get(value) ?? {
      value,
      direction: "se_to_tn",
      origin: "Stockholm",
      destination: "Tunis",
      originCountry: "SE",
      destinationCountry: "TN",
      timezone: "Europe/Stockholm",
      label: value.replace(/_/g, " → "),
      directionLabel: `${SWEDEN_LABEL} → ${TUNISIA_LABEL}`,
      vehicles: ["truck"],
    }
  );
}

/** The two headline direction cards on the Home screen. */
export const DIRECTION_CARDS = [
  {
    key: "se_to_tn" as const,
    title: SWEDEN_LABEL,
    target: TUNISIA_LABEL,
    country: "SE" as CountryCode,
    routeValue: ROUTE_VALUES.stockholmToTunis,
  },
  {
    key: "tn_to_se" as const,
    title: TUNISIA_LABEL,
    target: SWEDEN_LABEL,
    country: "TN" as CountryCode,
    routeValue: ROUTE_VALUES.tunisToStockholm,
  },
];

/** Vehicle presentation. */
export const VEHICLE_LABELS: Record<string, string> = {
  truck: "Truck",
  cargo_van: "Cargo van",
  container_ship: "Container ship",
  air_freight: "Air freight",
};

/** Trip status presentation. Mirrors the Studio's `status` options. */
export const TRIP_STATUS: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }
> = {
  available: { label: "Available", tone: "success" },
  full: { label: "Full", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "danger" },
  departed: { label: "Departed", tone: "info" },
};
