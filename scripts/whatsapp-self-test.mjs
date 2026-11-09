/**
 * WhatsApp gateway self-test.
 *
 * Boots the real admin server against a stand-in Graph API and drives the whole
 * flow: handshake, signature check, code verification, publishing from a
 * verified number, Sanity upload, visibility in the news query, retry
 * idempotency and revocation.
 *
 *   node scripts/whatsapp-self-test.mjs            # run and clean up after itself
 *   node scripts/whatsapp-self-test.mjs --keep     # leave the test posts in Sanity
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createClient } from "@sanity/client";

const APP_PORT = 3211;
const STUB_PORT = 4311;
const BASE = `http://127.0.0.1:${APP_PORT}`;
const SECRET = "self-test-app-secret";
const VERIFY = "self-test-verify-token";
const ADMIN = "46737778737";
const NEW_NUMBER = "46709998877";

const KEEP = process.argv.includes("--keep");
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
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

const stub = http.createServer((req, res) => {
  if (req.url.startsWith("/media-")) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      url: `http://127.0.0.1:${STUB_PORT}/file`,
      mime_type: sampleType,
      file_size: sample.length,
    }));
    return;
  }
  if (req.url === "/file") {
    res.setHeader("Content-Type", sampleType);
    res.end(sample);
    return;
  }
  // Message sends are fire-and-forget in the gateway; ack them so it stays quiet.
  if (req.url.endsWith("/messages")) {
    res.setHeader("Content-Type", "application/json");
    res.end("{}");
    return;
  }
  res.statusCode = 404;
  res.end("{}");
});

const server = spawn(process.execPath, ["server.mjs"], {
  env: {
    ...process.env,
    PORT: String(APP_PORT),
    WHATSAPP_GRAPH_BASE: `http://127.0.0.1:${STUB_PORT}`,
    WHATSAPP_TOKEN: "self-test-token",
    WHATSAPP_VERIFY_TOKEN: VERIFY,
    WHATSAPP_APP_SECRET: SECRET,
    WHATSAPP_ADMIN_NUMBERS: ADMIN,
    WHATSAPP_PHONE_NUMBER_ID: "self-test-phone-id",
    WHATSAPP_BUSINESS_NUMBER: "46737778737",
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

function envelope(message) {
  return {
    object: "whatsapp_business_account",
    entry: [{
      changes: [{
        value: { metadata: { phone_number_id: "self-test-phone-id" }, messages: [message] },
      }],
    }],
  };
}

const imageMessage = ({ from, messageId, caption }) => ({
  from,
  id: messageId,
  type: "image",
  image: { id: "media-self-test", mime_type: sampleType, caption },
});

async function postWebhook(body, { sign = true } = {}) {
  const raw = JSON.stringify(body);
  const headers = { "Content-Type": "application/json" };
  if (sign) {
    headers["X-Hub-Signature-256"] = "sha256=" + crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  }
  const response = await fetch(`${BASE}/api/whatsapp/webhook`, { method: "POST", headers, body: raw });
  return { status: response.status, json: await response.json().catch(() => null) };
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
  await new Promise((resolve) => stub.listen(STUB_PORT, resolve));
  await waitForHealth();
  record("admin server boots and answers /health", true);

  const status = await fetch(`${BASE}/api/whatsapp/status`).then((r) => r.json());
  record(
    "status endpoint reports the gateway ready",
    status.ready === true && status.webhookUrl.endsWith("/api/whatsapp/webhook"),
    status.webhookUrl,
  );

  const handshake = await fetch(`${BASE}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=challenge-123`);
  record("verification handshake echoes the challenge", handshake.status === 200 && (await handshake.text()) === "challenge-123");

  const rejected = await fetch(`${BASE}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x`);
  record("handshake rejects a wrong verify token", rejected.status === 403);

  const unsigned = await postWebhook(envelope(imageMessage({ from: ADMIN, messageId: "wamid.SELFTEST-unsigned", caption: "no signature" })), { sign: false });
  record("unsigned delivery is rejected", unsigned.status === 401);

  const stranger = await postWebhook(envelope(imageMessage({ from: "999000111", messageId: "wamid.SELFTEST-stranger", caption: "hi" })));
  record(
    "an unverified sender cannot publish",
    stranger.status === 200 && String(stranger.json?.results?.[0]?.skipped || "").includes("not verified"),
  );

  // Connect flow: ask for a code, then send it from WhatsApp.
  const start = await fetch(`${BASE}/api/whatsapp/verify/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "+46 70 999 88 77" }),
  });
  const startJson = await start.json().catch(() => null);
  record("the panel is handed a 6-digit code", start.status === 200 && /^\d{6}$/.test(startJson?.code || ""), startJson?.code);

  const verifyDelivery = await postWebhook(envelope({
    from: NEW_NUMBER,
    id: `wamid.SELFTEST-code-${Date.now()}`,
    type: "text",
    text: { body: startJson?.code },
  }));
  record("sending the code from WhatsApp verifies the number", Boolean(verifyDelivery.json?.results?.[0]?.verified));

  const statusAfter = await fetch(`${BASE}/api/whatsapp/status`).then((r) => r.json());
  record(
    "the verified number is listed for the panel",
    (statusAfter.numbers || []).some((item) => item.phone === NEW_NUMBER),
  );

  const verifiedMessageId = `wamid.SELFTEST-verified-${Date.now()}`;
  const verifiedPublish = await postWebhook(envelope(imageMessage({
    from: NEW_NUMBER,
    messageId: verifiedMessageId,
    caption: "Leverans på fredag",
  })));
  const documentId = verifiedPublish.json?.results?.[0]?.docId ?? null;
  record("a verified number publishes media", Boolean(documentId), documentId || JSON.stringify(verifiedPublish.json));

  const doc = documentId ? await sanity.getDocument(documentId) : null;
  if (documentId) createdDocs.push({ id: documentId, assetId: doc?.media?.image?.asset?._ref });
  record("the announcement is published with WhatsApp provenance", doc?.status === "published" && doc?.source === "whatsapp");
  record("the caption became the title", doc?.title === "Leverans på fredag");
  record("the image was uploaded as a Sanity asset", Boolean(doc?.media?.image?.asset?._ref));

  const inNews = documentId
    ? await sanity.fetch('count(*[_type == "announcement" && _id == $id && !(_id in path("drafts.**"))])', { id: documentId })
    : 0;
  record("the post is visible to the app's news query", inNews === 1);

  const retry = await postWebhook(envelope(imageMessage({ from: NEW_NUMBER, messageId: verifiedMessageId, caption: "Leverans på fredag" })));
  record("a Meta retry does not publish twice", String(retry.json?.results?.[0]?.skipped || "").includes("already published"));

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
  await sanity.delete(`whatsapp-admin-${NEW_NUMBER}`).catch(() => {});
  server.kill();
  stub.close();
}

const failed = results.filter((item) => !item.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
