/**
 * WhatsApp gateway self-test (Baileys bridge).
 *
 * Boots the real admin server with the live session disabled and drives the
 * HTTP surface: status, QR, input validation, adding a number, the full
 * publish pipeline (media → announcement → news query → idempotency) and
 * revocation — then deletes what it created.
 *
 *   node scripts/whatsapp-self-test.mjs            # run and clean up after itself
 *   node scripts/whatsapp-self-test.mjs --keep     # leave the test post in Sanity
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@sanity/client";

// Importing the server must not open a port or start Baileys in this process;
// the child below gets its own env without VERCEL so it does listen.
process.env.VERCEL = "1";
const { publishWhatsappMedia } = await import("../server.mjs");

const APP_PORT = 3211;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const NEW_NUMBER = "46709998877";

const KEEP = process.argv.includes("--keep");
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

/** A small real image from the repo, so the upload is a genuine JPEG/PNG. */
function findSampleImage() {
  const roots = ["assets", "app/assets", "images"].filter((root) => fs.existsSync(root)).map((root) => path.resolve(root));
  const stack = [...roots];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(png|jpe?g)$/i.test(entry.name) && fs.statSync(full).size < 5 * 1024 * 1024) return full;
    }
  }
  throw new Error("No sample image found under assets/");
}

const samplePath = findSampleImage();
const sample = fs.readFileSync(samplePath);
const sampleType = path.extname(samplePath).toLowerCase() === ".png" ? "image/png" : "image/jpeg";

const { VERCEL: _dropped, ...baseEnv } = process.env;
const server = spawn(process.execPath, ["server.mjs"], {
  env: {
    ...baseEnv,
    PORT: String(APP_PORT),
    WHATSAPP_GATEWAY_PORT: String(APP_PORT + 1),
    WHATSAPP_BRIDGE_ENABLED: "false",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/health`);
      if (response.ok) return;
    } catch {
      /* not listening yet */
    }
    await sleep(250);
  }
  throw new Error(`Admin server never became healthy.\n${serverLog.slice(-1500)}`);
}

const sanity = createClient({
  projectId: process.env.EXPO_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.EXPO_PUBLIC_SANITY_DATASET,
  token: process.env.EXPO_PUBLIC_SANITY_TOKEN,
  apiVersion: "2023-05-03",
  useCdn: false,
});

const createdDocs = [];

try {
  await waitForHealth();
  record("admin server boots and answers /health", true);

  const status = await fetch(`${BASE}/api/whatsapp/status`).then((r) => r.json());
  record(
    "status reports the session state",
    status.connected === false && Array.isArray(status.numbers),
    `connected=${status.connected}`,
  );

  record(
    "status explains a server with no session",
    status.bridgeActive === false && Boolean(status.bridgeNote),
  );

  const qr = await fetch(`${BASE}/api/whatsapp/qr`).then((r) => r.json());
  record("qr endpoint answers while unlinked", qr.connected === false && qr.qr === null);

  const invalid = await fetch(`${BASE}/api/whatsapp/numbers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "123" }),
  });
  record("short numbers are rejected", invalid.status === 400);

  // Read the current setting instead of assuming a default, then put it back.
  const allowAllInitial = status.allowAll === true;
  const toggle = (value) =>
    fetch(`${BASE}/api/whatsapp/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowAll: value }),
    });

  const allowAllOn = await toggle(!allowAllInitial);
  const statusAllowAll = await fetch(`${BASE}/api/whatsapp/status`).then((r) => r.json());
  record(
    "the panel can switch any-number mode on or off",
    allowAllOn.status === 200 && statusAllowAll.allowAll === !allowAllInitial,
    `now ${statusAllowAll.allowAll}`,
  );

  await toggle(allowAllInitial);
  const statusAllowAllRestored = await fetch(`${BASE}/api/whatsapp/status`).then((r) => r.json());
  record(
    "the previous setting is restored",
    statusAllowAllRestored.allowAll === allowAllInitial,
    `back to ${allowAllInitial}`,
  );

  const add = await fetch(`${BASE}/api/whatsapp/numbers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "+46 70 999 88 77" }),
  });
  const addJson = await add.json().catch(() => null);
  record("the panel can add a number directly", add.status === 200 && addJson?.phone === NEW_NUMBER, addJson?.phone);

  const statusAfter = await fetch(`${BASE}/api/whatsapp/status`).then((r) => r.json());
  record(
    "the added number is listed for the panel",
    (statusAfter.numbers || []).some((item) => item.phone === NEW_NUMBER),
  );

  const messageId = `selftest-${Date.now()}`;
  const published = await publishWhatsappMedia(
    {
      from: NEW_NUMBER,
      messageId,
      kind: "image",
      buffer: sample,
      contentType: sampleType,
      caption: "Leverans på fredag",
    },
    sanity,
  );
  const documentId = published?.docId ?? null;
  record("media publishes to an announcement", Boolean(documentId), documentId || JSON.stringify(published));

  const doc = documentId ? await sanity.getDocument(documentId) : null;
  if (documentId) createdDocs.push({ id: documentId, assetId: doc?.media?.image?.asset?._ref });
  record("the announcement is published with WhatsApp provenance", doc?.status === "published" && doc?.source === "whatsapp");
  record("the caption became the title", doc?.title === "Leverans på fredag");
  record("the image was uploaded as a Sanity asset", Boolean(doc?.media?.image?.asset?._ref));

  const inNews = documentId
    ? await sanity.fetch('count(*[_type == "announcement" && _id == $id && !(_id in path("drafts.**"))])', { id: documentId })
    : 0;
  record("the post is visible to the app's news query", inNews === 1);

  const retry = await publishWhatsappMedia(
    {
      from: NEW_NUMBER,
      messageId,
      kind: "image",
      buffer: sample,
      contentType: sampleType,
      caption: "Leverans på fredag",
    },
    sanity,
  );
  record("a duplicate delivery does not publish twice", String(retry?.skipped || "").includes("already published"));

  const removed = await fetch(`${BASE}/api/whatsapp/numbers/${NEW_NUMBER}`, { method: "DELETE" });
  const statusFinal = await fetch(`${BASE}/api/whatsapp/status`).then((r) => r.json());
  record(
    "removing a number revokes publishing",
    removed.status === 200 && !(statusFinal.numbers || []).some((item) => item.phone === NEW_NUMBER),
  );
} catch (error) {
  record("self-test completed without throwing", false, error.message);
} finally {
  for (const item of createdDocs) {
    if (KEEP) {
      console.log(`\nKept test post ${item.id}`);
      continue;
    }
    await sanity.delete(item.id).catch(() => {});
    if (item.assetId) await sanity.delete(item.assetId).catch(() => {});
    console.log(`\nCleaned up test post ${item.id}`);
  }
  server.kill();
}

const failed = results.filter((item) => !item.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
