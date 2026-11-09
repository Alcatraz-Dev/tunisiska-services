#!/usr/bin/env node
/**
 * Seed test news (announcements).
 *
 * Creates a handful of announcements so the News tab and the announcement
 * detail screen can be tested without waiting for real company news. The set
 * covers every state the UI renders: a featured story with a cover image, an
 * "Important" label, plain icon cards, a link, and a draft that must NOT show
 * up in the app.
 *
 * Every document is written with a `test-news-` id and a `testData` marker, so
 * it is trivially identifiable and removable afterwards:
 *
 *   npm run seed:news            # create / refresh
 *   npm run seed:news -- --dry-run
 *   npm run delete:news          # remove every seeded document
 *
 * Running this twice is safe: documents are written by explicit `_id`, so the
 * second run replaces the first instead of duplicating it.
 *
 * Media is not uploaded: if the dataset already holds an image or video asset,
 * the seeded announcements reference it, so the image and video render paths get
 * exercised without adding files to the project.
 */
import "dotenv/config";
import { createClient } from "@sanity/client";

const PROJECT_ID = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.EXPO_PUBLIC_SANITY_DATASET;
const TOKEN = process.env.EXPO_PUBLIC_SANITY_TOKEN;

const DRY_RUN = process.argv.includes("--dry-run");
const MARKER = "TEST DATA — remove with `npm run delete:news`";
const ID_PREFIX = "test-news-";

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

/** An ISO instant `hoursAgo` hours in the past. */
function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/** An existing asset of the given kind, or null. Never uploaded by this script. */
async function findAsset(query) {
  try {
    return await client.fetch(query);
  } catch {
    return null;
  }
}

function imageMedia(assetId) {
  return {
    _type: "media",
    type: "image",
    image: {
      _type: "image",
      asset: { _type: "reference", _ref: assetId },
    },
  };
}

function videoMedia(assetId) {
  return {
    _type: "media",
    type: "video",
    video: {
      _type: "file",
      asset: { _type: "reference", _ref: assetId },
    },
  };
}

function announcement({ id, title, publishedHoursAgo, icon, ...rest }) {
  const publishedAt = hoursAgo(publishedHoursAgo);
  return {
    _id: `${ID_PREFIX}${id}`,
    _type: "announcement",
    title: `[TEST] ${title}`,
    slug: { _type: "slug", current: `${ID_PREFIX}${id}` },
    date: publishedAt,
    publishedAt,
    icon,
    status: "published",
    isImportant: false,
    source: "manual",
    description: MARKER,
    testData: true,
    ...rest,
  };
}

async function main() {
  const image = await findAsset(
    '*[_type == "sanity.imageAsset"] | order(_createdAt desc)[0]{ _id }',
  );
  const video = await findAsset(
    '*[_type == "sanity.fileAsset" && mimeType match "video/*"] | order(_createdAt desc)[0]{ _id }',
  );

  const TEST_NEWS = [
    announcement({
      id: "service-update",
      title: "New departure Stockholm → Tunis added",
      publishedHoursAgo: 1,
      icon: "alert-circle",
      isImportant: true,
      message:
        "An extra departure leaves Stockholm on Friday. Space is limited, book early.",
      summary:
        "An extra departure leaves Stockholm on Friday. Space is limited, book early.",
      ...(image?._id ? { media: imageMedia(image._id) } : {}),
    }),
    announcement({
      id: "opening-hours",
      title: "Changed opening hours this weekend",
      publishedHoursAgo: 26,
      icon: "time-outline",
      message:
        "The office is open 10:00–14:00 on Saturday and closed on Sunday.",
      summary: "Saturday 10:00–14:00, closed Sunday.",
    }),
    announcement({
      id: "summer-campaign",
      title: "Summer campaign on container shipping",
      publishedHoursAgo: 72,
      icon: "pricetag-outline",
      message:
        "Book a container before the end of the month and get 10% off the shipping price.",
      summary: "10% off container shipping until the end of the month.",
      link: "https://example.com/summer-campaign",
    }),
    announcement({
      id: "track-and-trace",
      title: "Track your parcel in the app",
      publishedHoursAgo: 120,
      icon: "cube-outline",
      message:
        "Every booking now has live tracking. Open Track to follow the parcel from collection to delivery.",
      summary: "Live tracking is available for every booking.",
    }),
    ...(video?._id
      ? [
          announcement({
            id: "video-update",
            title: "Video update from the Tunis depot",
            publishedHoursAgo: 168,
            icon: "videocam-outline",
            message: "A short look at how parcels are loaded before departure.",
            summary: "How parcels are loaded before departure.",
            media: videoMedia(video._id),
          }),
        ]
      : []),
    // Never visible in the app: the News query excludes drafts. It is here so
    // the draft filter can be verified against real content.
    announcement({
      id: "draft-only",
      title: "Draft: pricing changes",
      publishedHoursAgo: 48,
      icon: "document-text-outline",
      status: "draft",
      message: "This announcement is a draft and must not appear in the app.",
      summary: "Draft — must not appear in News.",
    }),
  ];

  console.log(`\n🌱 Seeding ${TEST_NEWS.length} test announcements`);
  console.log(`   project: ${PROJECT_ID}`);
  console.log(`   dataset: ${DATASET}`);
  console.log(`   mode:    ${DRY_RUN ? "dry run (nothing written)" : "write"}`);
  console.log(
    `   media:   image ${image?._id ? "referenced" : "not found (card renders without a cover)"}, ` +
      `video ${video?._id ? "referenced" : "not found (video card skipped)"}\n`,
  );

  for (const doc of TEST_NEWS) {
    const state = doc.status === "draft" ? "draft (hidden)" : doc.isImportant ? "published, important" : "published";
    if (DRY_RUN) {
      console.log(`• would write ${doc._id}  ${state}  ${doc.date}`);
      continue;
    }

    await client.createOrReplace(doc);
    console.log(`✓ ${doc._id}  ${state}  ${doc.date}`);
  }

  console.log(
    DRY_RUN
      ? "\nDry run finished — nothing was written.\n"
      : "\nDone. Open the app's News tab: the featured story, the Important label,\n" +
          "the compact icon cards and the detail screen now have content.\n" +
          "The seeded draft stays hidden, as intended.\n" +
          "Remove everything any time with: npm run delete:news\n",
  );
}

main().catch((error) => {
  console.error("❌ Seeding failed:", error?.message ?? error);
  process.exit(1);
});
