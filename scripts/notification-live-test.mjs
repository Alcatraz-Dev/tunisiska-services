/**
 * Live push test with media.
 *
 * Sends one notification with an image and one with a video to the phones that
 * belong to admin accounts, writes both to notificationHistory (so they also
 * appear in the admin "Sent" list and the customer inbox) and reports the Expo
 * push tickets and receipts.
 *
 * It deliberately refuses to send when no admin device is registered: a test
 * must never pop up on a customer's phone.
 *
 *   node scripts/notification-live-test.mjs            # dry run, shows targets
 *   node scripts/notification-live-test.mjs --send     # actually sends
 */
import "dotenv/config";
import { createClient } from "@sanity/client";
import { buildPushMessages } from "../app/lib/pushPayload.ts";

const SEND = process.argv.includes("--send");
const EXPO_PUSH = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS = "https://exp.host/--/api/v2/push/getReceipts";

const mask = (token) => `${String(token).slice(0, 22)}…${String(token).slice(-6)}`;

const client = createClient({
  projectId: process.env.EXPO_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.EXPO_PUBLIC_SANITY_DATASET,
  token: process.env.EXPO_PUBLIC_SANITY_TOKEN,
  apiVersion: "2023-05-03",
  useCdn: false,
});

const admins = await client.fetch(
  `*[_type == "users" && isAdmin == true && defined(expoPushToken)]{ _id, email, expoPushToken, pushPlatform }`,
);
const all = await client.fetch(
  `*[_type == "users" && defined(expoPushToken)]{ _id, email, expoPushToken, pushPlatform }`,
);

console.log(`admin devices: ${admins.length}   all registered devices: ${all.length}`);
for (const admin of admins)
  console.log(
    `  admin: ${admin.email ?? admin._id}  ${admin.pushPlatform ?? "unknown platform"}  ${mask(admin.expoPushToken)}`,
  );

const targets = admins.filter((admin) =>
  /^Expo(nent)?PushToken\[[^\]]+\]$/.test(String(admin.expoPushToken).trim()),
);

if (targets.length === 0) {
  console.log("\nNo admin device has a push token yet — refusing to message customers.");
  process.exit(2);
}

const imageAsset = await client.fetch(
  `*[_type == "sanity.imageAsset" && defined(url)] | order(_createdAt desc)[0]{ url }`,
);
const videoAsset = await client.fetch(
  `*[_type == "sanity.fileAsset" && defined(url) && mimeType match "video/*"] | order(_createdAt desc)[0]{ url, mimeType }`,
);

const IMAGE = imageAsset?.url;
const VIDEO = videoAsset?.url ?? "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

console.log(`image: ${IMAGE ?? "(none found)"}`);
console.log(`video: ${VIDEO}${videoAsset?.url ? "" : " (public sample, no video asset in the dataset)"}`);

if (!IMAGE) {
  console.log("\nNo image asset in Sanity to test with.");
  process.exit(2);
}

console.log(`\n${SEND ? "SENDING" : "DRY RUN"} to ${targets.length} admin device(s)`);
if (!SEND) process.exit(0);

const tokens = targets.map((admin) => admin.expoPushToken.trim());
const docs = [];

async function sendOne({ title, message, imageUrl, videoUrl }) {
  const document = await client.create({
    _type: "notificationHistory",
    title,
    message,
    type: "announcement",
    ...(imageUrl ? { imageUrl } : {}),
    ...(videoUrl ? { videoUrl } : {}),
    sentAt: new Date().toISOString(),
    status: "sending",
    delivered: 0,
    failed: 0,
  });
  docs.push(document._id);

  const messages = buildPushMessages(tokens, {
    title,
    message,
    type: "announcement",
    notificationId: document._id,
    imageUrl,
    videoUrl,
  });

  const response = await fetch(EXPO_PUSH, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  const json = await response.json();
  const tickets = Array.isArray(json?.data) ? json.data : [json];

  const ok = tickets.filter((ticket) => ticket?.status === "ok");
  const errors = tickets.filter((ticket) => ticket?.status !== "ok");

  await client
    .patch(document._id)
    .set({ status: ok.length ? "sent" : "failed", delivered: ok.length, failed: errors.length })
    .commit();

  console.log(`\n${title} → doc ${document._id}`);
  console.log(`  http ${response.status}, accepted ${ok.length}/${tickets.length}`);
  for (const error of errors) console.log(`  error: ${error?.message} ${JSON.stringify(error?.details ?? {})}`);

  return { documentId: document._id, ticketIds: ok.map((ticket) => ticket.id) };
}

const imageSend = await sendOne({
  title: "Testbild",
  message: "Test: bildnotis från Tunisiska Mega",
  imageUrl: IMAGE,
});

const videoSend = await sendOne({
  title: "Testvideo",
  message: "Test: videonotis från Tunisiska Mega",
  videoUrl: VIDEO,
});

const ticketIds = [...imageSend.ticketIds, ...videoSend.ticketIds];
if (ticketIds.length) {
  console.log("\nWaiting 10s for push receipts…");
  await new Promise((resolve) => setTimeout(resolve, 10_000));

  const response = await fetch(EXPO_RECEIPTS, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ ids: ticketIds }),
  });
  const json = await response.json();
  console.log(JSON.stringify(json?.data ?? json, null, 2));
}

console.log(`\nDocuments left in place for inspection: ${docs.join(", ")}`);
