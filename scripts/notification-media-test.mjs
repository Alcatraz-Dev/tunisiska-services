/**
 * Notification media test.
 *
 * 1. Push payloads: an image must carry data.imageUrl + richContent.image, a
 *    video must carry data.videoUrl and no richContent, and a plain text push
 *    must carry neither.
 * 2. Sanity round trip: a notification document with an image (and one with a
 *    video) must come back through the exact query the customer inbox uses with
 *    its media intact. Test documents are deleted afterwards.
 *
 *   node scripts/notification-media-test.mjs
 */
import "dotenv/config";
import { createClient } from "@sanity/client";
import { buildPushMessages, pushMediaType, readPushMedia } from "../app/lib/pushPayload.ts";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ── Push payloads ──────────────────────────────────────────────────────────
const tokens = ["ExponentPushToken[aaa]", "ExponentPushToken[bbb]"];
const POSTER = "https://cdn.sanity.io/images/test/notifications/poster.jpg";
const IMAGE = "https://cdn.sanity.io/images/test/notifications/photo.jpg";
const VIDEO = "https://cdn.sanity.io/files/test/notifications/clip.mp4";

const imagePush = buildPushMessages(tokens, {
  title: "Ny leverans",
  message: "Din last är framme",
  type: "announcement",
  notificationId: "doc-1",
  imageUrl: "https://cdn.sanity.io/images/x/y/photo.jpg",
});
check("a push is built per device token", imagePush.length === tokens.length);
check("image push carries data.imageUrl", imagePush[0].data.imageUrl?.includes("photo.jpg") === true);
check("image push marks mediaType=image", imagePush[0].data.mediaType === "image");
check("image push asks Android to render the picture", imagePush[0].richContent?.image?.includes("photo.jpg") === true);
check("the notification id travels with the push", imagePush[0].data.notificationId === "doc-1");

const videoPush = buildPushMessages(tokens.slice(0, 1), {
  title: "Video från lagret",
  message: "Se den nya containern",
  type: "announcement",
  notificationId: "doc-2",
  videoUrl: "https://cdn.sanity.io/files/x/y/clip.mp4",
});
check("video push carries data.videoUrl", videoPush[0].data.videoUrl?.includes("clip.mp4") === true);
check("video push marks mediaType=video", videoPush[0].data.mediaType === "video");
check("video push has no Android rich image", videoPush[0].richContent === undefined);

const textPush = buildPushMessages(tokens.slice(0, 1), {
  title: "Påminnelse",
  message: "Bokning imorgon",
  type: "general",
  notificationId: "doc-3",
});
check(
  "a text-only push stays clean",
  textPush[0].data.imageUrl === undefined &&
    textPush[0].data.videoUrl === undefined &&
    textPush[0].data.mediaType === undefined &&
    textPush[0].richContent === undefined,
);
check("media type prefers video when both exist", pushMediaType({ imageUrl: "a", videoUrl: "b" }) === "video");

// ── What the phone stores from a delivered push ───────────────────────────
const receivedImage = readPushMedia(imagePush[0].data);
check("a received image push maps to the inbox image", receivedImage.image?.includes("photo.jpg") === true);
check("a received image push maps to mediaType=image", receivedImage.mediaType === "image");

const receivedVideo = readPushMedia(videoPush[0].data);
check("a received video push maps to videoUrl", receivedVideo.videoUrl?.includes("clip.mp4") === true);
check("a received video push maps to mediaType=video", receivedVideo.mediaType === "video");

check("a received text push maps to no media", Object.keys(readPushMedia(textPush[0].data)).length === 0);

const videoWithPoster = buildPushMessages(tokens.slice(0, 1), {
  title: "Video med omslag",
  message: "Ny container",
  type: "announcement",
  notificationId: "doc-4",
  imageUrl: POSTER,
  videoUrl: VIDEO,
});
check("a video push uses its poster as the Android image", videoWithPoster[0].richContent?.image === POSTER);
check("a video push stays mediaType=video with a poster", videoWithPoster[0].data.mediaType === "video");
check("the poster also reaches the inbox", videoWithPoster[0].data.imageUrl === POSTER);
const receivedPoster = readPushMedia(videoWithPoster[0].data);
check(
  "the inbox keeps both the poster and the video",
  receivedPoster.image === POSTER && receivedPoster.videoUrl === VIDEO && receivedPoster.mediaType === "video",
);

// ── Sanity round trip ──────────────────────────────────────────────────────
const client = createClient({
  projectId: process.env.EXPO_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.EXPO_PUBLIC_SANITY_DATASET,
  token: process.env.EXPO_PUBLIC_SANITY_TOKEN,
  apiVersion: "2023-05-03",
  useCdn: false,
});

const ids = [];
try {
  for (const [title, media] of [
    ["Testnotis med bild", { imageUrl: IMAGE }],
    ["Testnotis med video", { videoUrl: VIDEO, posterUrl: POSTER }],
  ]) {
    const doc = await client.create({
      _type: "notificationHistory",
      title,
      message: "Skickad från adminpanelen",
      type: "announcement",
      sentAt: new Date().toISOString(),
      status: "sending",
      delivered: 0,
      failed: 0,
      ...media,
    });
    ids.push(doc._id);
  }

  // The projection the customer inbox uses.
  const rows = await client.fetch(
    `*[_type == "notificationHistory" && _id in $ids && (!defined(status) || status != "deleted")] | order(coalesce(sentAt, dateSent, _createdAt) desc){
       "id": _id,
       "title": title,
       "message": message,
       "type": coalesce(type, notificationType),
       "date": coalesce(sentAt, dateSent),
       "image": coalesce(posterUrl, imageUrl),
       "video": videoUrl
     }`,
    { ids },
  );

  const byTitle = Object.fromEntries(rows.map((row) => [row.title, row]));
  check("the inbox query returns both notifications", rows.length === 2, `${rows.length} rows`);
  check("an image notification keeps its image", byTitle["Testnotis med bild"]?.image === IMAGE);
  check("a video notification keeps its video", byTitle["Testnotis med video"]?.video === VIDEO);
  check("a video notification shows its poster as the thumbnail", byTitle["Testnotis med video"]?.image === POSTER);
  check(
    "media does not leak across notifications",
    byTitle["Testnotis med bild"]?.video === null || byTitle["Testnotis med bild"]?.video === undefined,
  );
} catch (error) {
  check("Sanity round trip completed without throwing", false, error.message);
} finally {
  for (const id of ids) await client.delete(id).catch(() => {});
  if (ids.length) console.log(`\nCleaned up ${ids.length} test notifications`);
}

const failed = results.filter((item) => !item.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
