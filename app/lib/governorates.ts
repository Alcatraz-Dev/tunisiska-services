/**
 * Tunisian governorates.
 *
 * The full administrative list — 24 governorates — used as the **selection
 * list** for administrators when they configure collection and delivery
 * points on a trip.
 *
 * This list is not availability in itself. Which governorates a given trip
 * actually serves comes from that trip's `tunisiaLocations` in Sanity, so
 * availability is always per trip.
 */

export type Governorate = {
  /** Display name. */
  name: string;
  /** Stable key used for matching and selection. */
  key: string;
  /** The delegate / capital of the governorate. */
  capital: string;
};

export const GOVERNORATES: Governorate[] = [
  { name: "Ariana", key: "ariana", capital: "Ariana" },
  { name: "Béja", key: "beja", capital: "Béja" },
  { name: "Ben Arous", key: "ben_arous", capital: "Ben Arous" },
  { name: "Bizerte", key: "bizerte", capital: "Bizerte" },
  { name: "Gabès", key: "gabes", capital: "Gabès" },
  { name: "Gafsa", key: "gafsa", capital: "Gafsa" },
  { name: "Jendouba", key: "jendouba", capital: "Jendouba" },
  { name: "Kairouan", key: "kairouan", capital: "Kairouan" },
  { name: "Kasserine", key: "kasserine", capital: "Kasserine" },
  { name: "Kebili", key: "kebili", capital: "Kebili" },
  { name: "Kef", key: "kef", capital: "El Kef" },
  { name: "Mahdia", key: "mahdia", capital: "Mahdia" },
  { name: "Manouba", key: "manouba", capital: "Manouba" },
  { name: "Medenine", key: "medenine", capital: "Medenine" },
  { name: "Monastir", key: "monastir", capital: "Monastir" },
  { name: "Nabeul", key: "nabeul", capital: "Nabeul" },
  { name: "Sfax", key: "sfax", capital: "Sfax" },
  { name: "Sidi Bouzid", key: "sidi_bouzid", capital: "Sidi Bouzid" },
  { name: "Siliana", key: "siliana", capital: "Siliana" },
  { name: "Sousse", key: "sousse", capital: "Sousse" },
  { name: "Tataouine", key: "tataouine", capital: "Tataouine" },
  { name: "Tozeur", key: "tozeur", capital: "Tozeur" },
  { name: "Tunis", key: "tunis", capital: "Tunis" },
  { name: "Zaghouan", key: "zaghouan", capital: "Zaghouan" },
];

const byKey = new Map(GOVERNORATES.map((g) => [g.key, g]));
const byName = new Map(GOVERNORATES.map((g) => [g.name.toLowerCase(), g]));

/** Look up a governorate by key or name. */
export function findGovernorate(value?: string | null): Governorate | undefined {
  if (!value) return undefined;
  const key = value.toLowerCase().replace(/[^a-z_]/g, "_");
  return byKey.get(key) ?? byName.get(value.toLowerCase());
}

/** Normalise a governorate name into its stable key. */
export function governorateKey(value?: string | null): string {
  if (!value) return "";
  const found = findGovernorate(value);
  if (found) return found.key;
  return value.toLowerCase().replace(/\s+/g, "_");
}
