#!/usr/bin/env node
/**
 * Delete every seeded test announcement.
 *
 * Only documents created by `npm run seed:news` are touched: they are matched
 * by id prefix (`test-news-`) or by the `testData` marker, so real company news
 * can never be deleted by accident.
 *
 *   npm run delete:news             # delete all seeded announcements
 *   npm run delete:news -- --dry-run
 *
 * The script does not delete media assets: seeded announcements only reference
 * assets that already existed in the dataset.
 */
import "dotenv/config";
import { createClient } from "@sanity/client";

const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET;
const TOKEN = process.env.EXPO_PUBLIC_SANITY_TOKEN;

const DRY_RUN = process.argv.includes("--dry-run");
const ID_PREFIX = "test-news-";

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

/** Seeded announcements only: explicit id prefix, or the testData marker. */
const QUERY = `*[
  _type == "announcement"
  && (string::startsWith(_id, $prefix) || testData == true)
]{ _id, title, status, isImportant, date } | order(date desc)`;

async function main() {
  const docs = await client.fetch(QUERY, { prefix: ID_PREFIX });

  if (!Array.isArray(docs) || docs.length === 0) {
    console.log("\nNothing to delete — no seeded test announcements found.\n");
    return;
  }

  console.log(`\n🧹 ${docs.length} seeded announcement(s) found`);
  console.log(`   project: ${PROJECT_ID}`);
  console.log(`   dataset: ${DATASET}`);
  console.log(`   mode:    ${DRY_RUN ? "dry run (nothing deleted)" : "delete"}\n`);

  for (const doc of docs) {
    if (DRY_RUN) {
      console.log(`• would delete ${doc._id}  ${doc.status ?? "published"}  ${doc.title}`);
      continue;
    }
    await client.delete(doc._id);
    console.log(`✓ deleted ${doc._id}  ${doc.title}`);
  }

  console.log(
    DRY_RUN
      ? "\nDry run finished — nothing was deleted.\n"
      : "\nDone. The News tab will show the empty state again.\n",
  );
}

main().catch((error) => {
  console.error("❌ Delete failed:", error?.message ?? error);
  process.exit(1);
});
