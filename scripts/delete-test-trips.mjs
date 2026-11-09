#!/usr/bin/env node
/**
 * Delete every seeded test departure.
 *
 * Only documents created by `npm run seed:trips` are touched: they are matched
 * by id prefix (`test-trip-`) or by the notes marker, so real schedules can
 * never be deleted by accident.
 *
 *   npm run delete:trips             # delete all seeded departures
 *   npm run delete:trips -- --dry-run
 */
import "dotenv/config";
import { createClient } from "@sanity/client";

const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET;
const TOKEN = process.env.EXPO_PUBLIC_SANITY_TOKEN;

const DRY_RUN = process.argv.includes("--dry-run");
const ID_PREFIX = "test-trip-";
const MARKER = "TEST DATA";

if (!PROJECT_ID || !DATASET) {
  console.error(
    "❌ Missing EXPO_PUBLIC_SANITY_PROJECT_ID or EXPO_PUBLIC_SANITY_DATASET in .env",
  );
  process.exit(1);
}

if (!TOKEN) {
  console.error(
    "❌ Missing EXPO_PUBLIC_SANITY_TOKEN in .env — deleting requires a token with delete rights.",
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

/** Seeded departures only: explicit id prefix, or the notes marker. */
const QUERY = `*[
  _type in ["shippingSchedule", "containerShippingSchedule"]
  && (string::startsWith(_id, $prefix) || notes match $marker)
]{ _id, _type, route, departureTime }`;

async function main() {
  const docs = await client.fetch(QUERY, { prefix: ID_PREFIX, marker: MARKER });

  if (!Array.isArray(docs) || docs.length === 0) {
    console.log("\nNothing to delete — no seeded test departures found.\n");
    return;
  }

  console.log(`\n🧹 ${docs.length} seeded departure(s) found`);
  console.log(`   project: ${PROJECT_ID}`);
  console.log(`   dataset: ${DATASET}`);
  console.log(`   mode:    ${DRY_RUN ? "dry run (nothing deleted)" : "delete"}\n`);

  for (const doc of docs) {
    if (DRY_RUN) {
      console.log(`• would delete ${doc._id}  ${doc.route}  ${doc.departureTime}`);
      continue;
    }
    await client.delete(doc._id);
    console.log(`✓ deleted ${doc._id}`);
  }

  console.log(
    DRY_RUN
      ? "\nDry run finished — nothing was deleted.\n"
      : "\nDone. The app will show the empty states again.\n",
  );
}

main().catch((error) => {
  console.error("❌ Delete failed:", error?.message ?? error);
  process.exit(1);
});
