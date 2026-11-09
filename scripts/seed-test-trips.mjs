#!/usr/bin/env node
/**
 * Seed test departures.
 *
 * Creates a handful of genuinely upcoming departures so every screen that reads
 * the schedule — Home, Trips, Calendar, Map, Live Status — has real data to test
 * against.
 *
 * Every document is written with a `test-trip-` id and a `notes` marker, so it
 * is trivially identifiable and removable afterwards:
 *
 *   npm run seed:trips            # create / refresh
 *   npm run seed:trips -- --dry-run
 *   npm run delete:trips          # remove every seeded document
 *
 * Running this twice is safe: documents are written by explicit `_id`, so the
 * second run replaces the first instead of duplicating it.
 */
import "dotenv/config";
import { createClient } from "@sanity/client";

const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET;
const TOKEN = process.env.EXPO_PUBLIC_SANITY_TOKEN;

const DRY_RUN = process.argv.includes("--dry-run");
const MARKER = "TEST DATA — remove with `npm run delete:trips`";
const ID_PREFIX = "test-trip-";

if (!PROJECT_ID || !DATASET) {
  console.error(
    "❌ Missing EXPO_PUBLIC_SANITY_PROJECT_ID or EXPO_PUBLIC_SANITY_DATASET in .env",
  );
  process.exit(1);
}

if (!TOKEN) {
  console.error(
    "❌ Missing EXPO_PUBLIC_SANITY_TOKEN in .env — writing requires a token with create/update rights.",
  );
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: "2023-05-03",
  useCdn: false,
});

/** An ISO instant `daysFromNow` days ahead, at the given UTC hour. */
function departure(daysFromNow, hourUtc) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date.toISOString();
}

const TEST_TRIPS = [
  {
    _id: `${ID_PREFIX}stockholm-tunis`,
    _type: "shippingSchedule",
    route: "stockholm_tunis",
    departureTime: departure(3, 8),
    status: "available",
    vehicle: "truck",
    capacity: 12000,
    availableCapacity: 8500,
    isActive: false,
    summary: "Test departure Stockholm → Tunis with room for pallets.",
    notes: MARKER,
    tunisiaLocations: [
      {
        governorate: "Tunis",
        governorateKey: "tunis",
        available: true,
        collectionPoints: [
          { name: "Tunis centre", address: "Avenue Habib Bourguiba, Tunis" },
        ],
        deliveryPoints: [
          { name: "Tunis depot", address: "Rue de Marseille, Tunis" },
        ],
      },
      {
        governorate: "Sousse",
        governorateKey: "sousse",
        available: true,
        collectionPoints: [{ name: "Sousse centre", address: "Avenue Habib Bourguiba, Sousse" }],
        deliveryPoints: [{ name: "Sousse depot", address: "Route de la Corniche, Sousse" }],
      },
      {
        governorate: "Sfax",
        governorateKey: "sfax",
        available: false,
        notes: "Not served on this test departure.",
        collectionPoints: [],
        deliveryPoints: [],
      },
    ],
    swedenCollection: {
      postalInstructions:
        "Test data: post the parcel to the Stockholm office at least 5 days before departure.",
      personalHandoverInstructions:
        "Test data: hand the parcel over at the office on weekdays 09:00–17:00.",
    },
  },
  {
    _id: `${ID_PREFIX}tunis-stockholm`,
    _type: "shippingSchedule",
    route: "tunis_stockholm",
    departureTime: departure(6, 9),
    status: "available",
    vehicle: "cargo_van",
    capacity: 9000,
    availableCapacity: 4200,
    isActive: false,
    summary: "Test departure Tunis → Stockholm, half full.",
    notes: MARKER,
    tunisiaLocations: [
      {
        governorate: "Tunis",
        governorateKey: "tunis",
        available: true,
        collectionPoints: [{ name: "Tunis centre", address: "Avenue Habib Bourguiba, Tunis" }],
        deliveryPoints: [{ name: "Stockholm office", address: "Sveavägen 1, Stockholm" }],
      },
      {
        governorate: "Ariana",
        governorateKey: "ariana",
        available: true,
        collectionPoints: [{ name: "Ariana centre", address: "Avenue de Carthage, Ariana" }],
        deliveryPoints: [],
      },
    ],
  },
  {
    _id: `${ID_PREFIX}tunis-sousse`,
    _type: "shippingSchedule",
    route: "tunis_sousse",
    departureTime: departure(9, 7),
    status: "available",
    vehicle: "truck",
    capacity: 6000,
    availableCapacity: 6000,
    isActive: false,
    summary: "Test departure Tunis → Sousse, empty vehicle.",
    notes: MARKER,
    tunisiaLocations: [
      {
        governorate: "Sousse",
        governorateKey: "sousse",
        available: true,
        collectionPoints: [{ name: "Sousse centre", address: "Avenue Habib Bourguiba, Sousse" }],
        deliveryPoints: [{ name: "Sousse depot", address: "Route de la Corniche, Sousse" }],
      },
    ],
  },
  {
    _id: `${ID_PREFIX}tunis-sfax`,
    _type: "shippingSchedule",
    route: "tunis_sfax",
    departureTime: departure(12, 10),
    status: "available",
    vehicle: "cargo_van",
    capacity: 5000,
    availableCapacity: 900,
    isActive: false,
    summary: "Test departure Tunis → Sfax, nearly full.",
    notes: MARKER,
    tunisiaLocations: [
      {
        governorate: "Sfax",
        governorateKey: "sfax",
        available: true,
        collectionPoints: [{ name: "Sfax centre", address: "Avenue Hedi Chaker, Sfax" }],
        deliveryPoints: [{ name: "Sfax depot", address: "Route de Gabès, Sfax" }],
      },
    ],
  },
  {
    _id: `${ID_PREFIX}container-tunis-stockholm`,
    _type: "containerShippingSchedule",
    route: "tunis_stockholm",
    departureTime: departure(15, 6),
    status: "available",
    vehicle: "container_ship",
    capacity: 8,
    availableCapacity: 5,
    isActive: false,
    summary: "Test container sailing Tunis → Stockholm, 5 containers free.",
    notes: MARKER,
    tunisiaLocations: [
      {
        governorate: "Tunis",
        governorateKey: "tunis",
        available: true,
        collectionPoints: [
          { name: "Radès port", address: "Port de Radès, Ben Arous" },
        ],
        deliveryPoints: [{ name: "Stockholm port", address: "Värtahamnen, Stockholm" }],
      },
    ],
  },
];

async function main() {
  console.log(`\n🌱 Seeding ${TEST_TRIPS.length} test departures`);
  console.log(`   project: ${PROJECT_ID}`);
  console.log(`   dataset: ${DATASET}`);
  console.log(`   mode:    ${DRY_RUN ? "dry run (nothing written)" : "write"}\n`);

  for (const trip of TEST_TRIPS) {
    const when = new Date(trip.departureTime).toISOString();
    if (DRY_RUN) {
      console.log(`• would write ${trip._id}  ${trip.route}  ${when}`);
      continue;
    }

    await client.createOrReplace(trip);
    console.log(`✓ ${trip._id}  ${trip._type}  ${trip.route}  ${when}`);
  }

  console.log(
    DRY_RUN
      ? "\nDry run finished — nothing was written.\n"
      : "\nDone. Open the app: Home, Trips, Calendar, Map and Live Status now have departures.\n" +
          "Remove them any time with: npm run delete:trips\n",
  );
}

main().catch((error) => {
  console.error("❌ Seeding failed:", error?.message ?? error);
  process.exit(1);
});
