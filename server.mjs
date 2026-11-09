import express from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import os from "os";
import crypto from "node:crypto";
import { createClient } from "@sanity/client";

dotenv.config();

const app = express();
app.use(cors({ origin: "*" })); // You can restrict to your app domain in production
const PORT = process.env.PORT || 3000;

// --- Sanity export route (single copy only)
app.get("/sanity/export", async (req, res) => {
  try {
    const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID || "c7b65ce0-2aa6-4b42-b6d7-4f04277bc839";
    const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET || "production";
    const token = process.env.EXPO_PUBLIC_SANITY_TOKEN || "";

    console.log("🔍 [SANITY EXPORT] Environment variables:");
    console.log("🔍 [SANITY EXPORT] SANITY_PROJECT_ID:", projectId ? "present" : "missing");
    console.log("🔍 [SANITY EXPORT] SANITY_DATASET:", dataset ? "present" : "missing");
    console.log("🔍 [SANITY EXPORT] SANITY_API_TOKEN:", token ? "present (length: " + token.length + ")" : "missing");

    const url = `https://${projectId}.api.sanity.io/v2021-06-07/data/export/${dataset}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(text);
    }

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sanity-backup-${new Date()
        .toISOString()
        .split("T")[0]}.ndjson"`
    );

    // Handle the response body properly
    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error("Sanity export error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// ⚠️ Use server-side secret key (not EXPO_PUBLIC)
const STRIPE_SECRET_KEY = process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY is missing in .env");
  process.exit(1);
}

console.log("🔄 Starting Stripe Payment Server...");

// Function to get local IP addresses
const getLocalIPs = () => {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
};

// Log available IP addresses for real device testing
const localIPs = getLocalIPs();
console.log("🌐 Available local IP addresses for real device testing:");
localIPs.forEach(ip => console.log(`   http://${ip}:${PORT}`));
console.log("💡 For real devices, use one of these IPs instead of localhost");

// Middleware
app.use(cors({ origin: "*" })); // You can restrict to your app domain in production
// `rawBody` is kept for the WhatsApp webhook, whose HMAC is computed over the
// exact bytes Meta sent — re-serialising the parsed JSON would break it.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

// Request logging
app.use((req, res, next) => {
  console.log(`📱 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ─── Sanity gateway ──────────────────────────────────────────────────────────
// A browser cannot read from *.api.sanity.io unless the page's origin is listed
// in the Sanity project's CORS allowlist, and the Vercel web build is not. The
// web app therefore sends its Sanity HTTP traffic here, and this server signs it
// with the project token. That also stops the browser from ever seeing the token.
//
// Only the data API is reachable — query, export, mutate and single documents.
// Auth, project management and asset endpoints are refused, so the gateway
// cannot be used to mint tokens or touch project settings.
const SANITY_ALLOWED_PATH = /^\/v\d{4}-\d{2}-\d{2}\/(data\/(query|export|mutate|doc)\/|data\/doc\/)/;

app.use("/api/sanity", async (req, res) => {
  const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
  const token = process.env.EXPO_PUBLIC_SANITY_TOKEN;

  if (!projectId || !token) {
    return res.status(503).json({ error: "Sanity is not configured on this server" });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Mounting strips `/api/sanity`, so this is the Sanity path plus its query.
  const upstreamPath = req.url;
  if (!SANITY_ALLOWED_PATH.test(upstreamPath.split("?")[0])) {
    return res.status(403).json({ error: "Unsupported Sanity endpoint" });
  }

  try {
    const upstream = await fetch(`https://${projectId}.api.sanity.io${upstreamPath}`, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(req.method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: req.method === "POST" ? JSON.stringify(req.body ?? {}) : undefined,
    });

    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    // Never let a stale proxy response hide freshly published CMS content.
    res.setHeader("Cache-Control", "no-store");
    res.send(body);
  } catch (error) {
    console.error("❌ [SANITY] Gateway request failed:", error.message);
    res.status(502).json({ error: "Sanity request failed" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running", timestamp: new Date() });
});

// Stripe payment result pages (used as WebView redirect targets)
app.get("/payment-success", (req, res) => {
  const { points, amount, session_id } = req.query;
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Betalning genomf\u00f6rd</title></head><body style="background:#0a0a0a;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0;"><div style="text-align:center;padding:40px;"><div style="font-size:64px;margin-bottom:16px;">\u2705</div><h1 style="color:#fff;font-size:24px;margin-bottom:8px;">Betalning genomf\u00f6rd!</h1><p style="color:#9ca3af;font-size:16px;">Din betalning har bekr\u00e4ftats.</p></div></body></html>`);
});

app.get("/payment-cancel", (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avbruten</title></head><body style="background:#0a0a0a;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0;"><div style="text-align:center;padding:40px;"><div style="font-size:64px;margin-bottom:16px;">\u274c</div><h1 style="color:#fff;font-size:24px;margin-bottom:8px;">Betalning avbruten</h1><p style="color:#9ca3af;font-size:16px;">Betalningen avbr\u00f6ts. Stäng detta f\u00f6nster.</p></div></body></html>`);
});

// API endpoint for updating user points
app.post("/api/update-user-points", async (req, res) => {
  try {
    const { userId, pointsToAdd, description, senderId } = req.body;

    if (!userId || typeof pointsToAdd !== 'number') {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    // Import Clerk client dynamically
    const { clerkClient } = await import('@clerk/clerk-sdk-node');

    // Get recipient's current data
    const recipientUser = await clerkClient.users.getUser(userId);
    const recipientCurrentPoints = (recipientUser.unsafeMetadata)?.points || 0;
    const recipientNewPoints = recipientCurrentPoints + pointsToAdd;

    // Update recipient's points
    await clerkClient.users.updateUser(userId, {
      unsafeMetadata: {
        ...(recipientUser.unsafeMetadata),
        points: recipientNewPoints,
      }
    });

    // Add transaction record for recipient
    const recipientTransactions = (recipientUser.unsafeMetadata)?.transactions || [];
    recipientTransactions.unshift({
      id: `received_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "earned",
      points: pointsToAdd,
      description: description,
      date: new Date().toISOString(),
    });

    // Keep only the last 50 transactions
    const limitedTransactions = recipientTransactions.slice(0, 50);

    await clerkClient.users.updateUser(userId, {
      unsafeMetadata: {
        ...(recipientUser.unsafeMetadata),
        transactions: limitedTransactions,
      }
    });

    // If this is a transfer, also update sender's points (deduct)
    if (senderId && pointsToAdd > 0) {
      try {
        const senderUser = await clerkClient.users.getUser(senderId);
        const senderCurrentPoints = (senderUser.unsafeMetadata)?.points || 0;
        const senderNewPoints = senderCurrentPoints - pointsToAdd;

        // Update sender's points
        await clerkClient.users.updateUser(senderId, {
          unsafeMetadata: {
            ...(senderUser.unsafeMetadata),
            points: senderNewPoints,
          }
        });

        // Add transaction record for sender
        const senderTransactions = (senderUser.unsafeMetadata)?.transactions || [];
        senderTransactions.unshift({
          id: `transfer_sent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: "spent",
          points: pointsToAdd,
          description: `Överfört ${pointsToAdd} poäng till mottagare`,
          date: new Date().toISOString(),
        });

        // Keep only the last 50 transactions for sender
        const limitedSenderTransactions = senderTransactions.slice(0, 50);

        await clerkClient.users.updateUser(senderId, {
          unsafeMetadata: {
            ...(senderUser.unsafeMetadata),
            transactions: limitedSenderTransactions,
          }
        });

        // Update sender's points in Sanity
        const { createClient } = await import('@sanity/client');
        const client = createClient({
          projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
          dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
          useCdn: false,
          token: process.env.SANITY_AUTH_TOKEN,
          apiVersion: '2024-01-01',
        });

        const senderDoc = await client.fetch(
          `*[_type == "users" && clerkId == $clerkId][0]`,
          { clerkId: senderId }
        );

        if (senderDoc) {
          await client
            .patch(senderDoc._id)
            .set({ points: senderNewPoints })
            .commit();
        }

        console.log(`✅ Updated sender ${senderId}: ${senderCurrentPoints} -> ${senderNewPoints} points`);
      } catch (senderError) {
        console.error('❌ Error updating sender points:', senderError);
        // Don't fail the entire request if sender update fails
      }
    }

    console.log(`✅ Updated user ${userId}: ${recipientCurrentPoints} -> ${recipientNewPoints} points`);

    res.json({
      success: true,
      newPoints: recipientNewPoints,
      message: `Successfully added ${pointsToAdd} points to user ${userId}`
    });

  } catch (error) {
    console.error('❌ Error updating user points:', error);
    res.status(500).json({
      error: 'Failed to update user points',
      details: error.message
    });
  }
});

// Stripe initialization
let stripe;
try {
  stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-09-30.acacia" });
  console.log("✅ Stripe initialized");
} catch (error) {
  console.error("⚠️ Stripe init error:", error.message);
}


// Payment sheet endpoint (for native apps)
app.post("/payment-sheet", async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount) return res.status(400).json({ error: "Amount is required" });

    const usedCurrency = currency || "sek";

    let paymentMethodTypes;
    if (usedCurrency === "sek") {
      paymentMethodTypes = ["card", "klarna", "link"];
    } else if (usedCurrency === "eur") {
      paymentMethodTypes = [
        "card", "klarna", "bancontact", "eps", "giropay",
        "ideal", "p24", "sepa_debit", "sofort", "link"
      ];
    } else {
      paymentMethodTypes = ["card", "link"];
    }

    const customer = await stripe.customers.create();

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2024-09-30.acacia" }
    );

    // Convert amount to smallest currency unit (öre for SEK)
    const stripeAmount = usedCurrency === "sek" ? amount * 100 : amount;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: usedCurrency,
      customer: customer.id,
      payment_method_types: paymentMethodTypes,
      metadata: { integration: "mobile_payment_sheet" }
    });

    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Checkout session endpoint (for web)
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { amount, currency, successUrl, cancelUrl, points , service , isWallet } = req.body;
    console.log("📡 [SERVER] Received checkout request:", { amount, currency, points  });

    if (!amount) return res.status(400).json({ error: "Amount is required" });

    const usedCurrency = currency || "sek";
    // Amount is already in cents from the client
    const stripeAmount = amount;
    console.log("💰 [SERVER] Stripe amount (cents):", stripeAmount);

    const displayAmount = (amount / 100).toFixed(2);
    const displayPoints = points || Math.round(amount / 100 * 10);
    console.log("🎯 [SERVER] Display amount:", displayAmount, "Display points:", displayPoints);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: usedCurrency,
            product_data: {
              name: isWallet ? `${displayPoints} Poäng - Tunisiska Mega Service` : `${service || 'Tjänst'} - Tunisiska Mega Service`,
              description: isWallet ? `Köp ${displayPoints} poäng för ${displayAmount} ${usedCurrency.toUpperCase()}` : `Betalning för ${service || 'Tjänst'} - ${displayAmount} ${usedCurrency.toUpperCase()}`,
            },
            unit_amount: stripeAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}&points=${displayPoints}&amount=${displayAmount}`,
      cancel_url: cancelUrl || `${process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000'}/payment-cancel`,
      metadata: {
        integration: "web_checkout",
        points: displayPoints.toString(),
        amount_sek: displayAmount
      }
    });

    console.log("✅ [SERVER] Checkout session created:", session.id, "URL:", session.url);
    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (err) {
    console.error("❌ [SERVER] Checkout session error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── WhatsApp gateway ────────────────────────────────────────────────────────
// Inbound WhatsApp media becomes News. An allowlisted admin sends a photo or
// video to the business number, Meta calls this webhook, the media is copied
// into Sanity and published as an `announcement` — the same document the app's
// News tab already reads.

// Overridable so the self-test can stand in for the Graph API.
const WHATSAPP_API = process.env.WHATSAPP_GRAPH_BASE || "https://graph.facebook.com/v21.0";
/** Meta caps inbound images at 5 MB and video at 16 MB. */
const WHATSAPP_MAX_BYTES = 16 * 1024 * 1024;

function whatsappConfig() {
  return {
    token: process.env.WHATSAPP_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    appSecret: process.env.WHATSAPP_APP_SECRET || "",
    admins: (process.env.WHATSAPP_ADMIN_NUMBERS || "")
      .split(",")
      .map((number) => number.replace(/[^0-9]/g, ""))
      .filter(Boolean),
  };
}

/** A write-capable Sanity client, or null when the deployment has no token. */
function sanityWriteClient() {
  const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET;
  const token = process.env.EXPO_PUBLIC_SANITY_TOKEN;
  if (!projectId || !dataset || !token) return null;
  return createClient({ projectId, dataset, token, apiVersion: "2023-05-03", useCdn: false });
}

function verifyWhatsappSignature(req, appSecret) {
  const received = req.get("x-hub-signature-256") || "";
  if (!req.rawBody || !received) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(req.rawBody).digest("hex");
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function extensionFor(contentType) {
  const type = String(contentType).toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("quicktime")) return "mov";
  if (type.includes("3gpp")) return "3gp";
  return type.startsWith("video/") ? "mp4" : "jpg";
}

/** Resolve a WhatsApp media id to bytes through the Graph API. */
async function downloadWhatsappMedia(mediaId, token, kind) {
  const lookup = await fetch(`${WHATSAPP_API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!lookup.ok) {
    throw new Error(`Media lookup failed (${lookup.status})`);
  }

  const info = await lookup.json();
  if (!info?.url) throw new Error("Media lookup returned no URL");
  if (info.file_size && info.file_size > WHATSAPP_MAX_BYTES) {
    throw new Error("Media is larger than 16 MB");
  }

  const download = await fetch(info.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!download.ok) {
    throw new Error(`Media download failed (${download.status})`);
  }

  const buffer = Buffer.from(await download.arrayBuffer());
  if (buffer.byteLength > WHATSAPP_MAX_BYTES) {
    throw new Error("Media is larger than 16 MB");
  }

  const contentType =
    info.mime_type || (kind === "image" ? "image/jpeg" : "video/mp4");
  return {
    buffer,
    contentType,
    filename: `${mediaId.replace(/[^a-zA-Z0-9]/g, "")}.${extensionFor(contentType)}`,
  };
}

/** Turn one inbound image/video message into a published announcement. */
async function publishWhatsappMessage(message, client) {
  const kind =
    message?.type === "image" ? "image" : message?.type === "video" ? "video" : null;
  if (!kind) return { skipped: `unsupported message type: ${message?.type || "unknown"}` };

  const mediaId =
    kind === "image" ? message.image?.id : message.video?.id;
  if (!mediaId) return { skipped: "message carried no media id" };

  // One document per WhatsApp message: Meta retries webhooks, and a retry must
  // update nothing rather than publish the same photo twice.
  const docId = `whatsapp-${String(message.id || mediaId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const existing = await client.getDocument(docId).catch(() => null);
  if (existing) return { skipped: "already published", docId };

  const media = await downloadWhatsappMedia(mediaId, whatsappConfig().token, kind);
  const asset = await client.assets.upload(
    kind === "image" ? "image" : "file",
    media.buffer,
    { filename: media.filename, contentType: media.contentType },
  );

  const caption = String(
    (kind === "image" ? message.image?.caption : message.video?.caption) || "",
  ).trim();
  const title = caption.split("\n")[0].slice(0, 90).trim() || (kind === "image" ? "Nytt foto" : "Ny video");
  const publishedAt = new Date().toISOString();

  await client.createIfNotExists({
    _id: docId,
    _type: "announcement",
    title,
    slug: { _type: "slug", current: `${slugify(title) || "nytt-inlagg"}-${docId.slice(-6)}` },
    message: caption,
    description: caption,
    date: publishedAt,
    publishedAt,
    status: "published",
    isImportant: false,
    icon: "logo-whatsapp",
    source: "whatsapp",
    whatsappSender: message.from,
    media: {
      _type: "media",
      type: kind,
      ...(kind === "image"
        ? { image: { _type: "image", asset: { _type: "reference", _ref: asset._id } } }
        : { video: { _type: "file", asset: { _type: "reference", _ref: asset._id } } }),
    },
  });

  console.log(`✅ [WHATSAPP] Published ${kind} from ${message.from} as ${docId}`);
  return { docId };
}

const VERIFICATION_TTL_MS = 10 * 60 * 1000;

function normalizePhone(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function maskPhone(phone) {
  const digits = normalizePhone(phone);
  return digits.length > 4 ? `${digits.slice(0, 3)}•••${digits.slice(-3)}` : digits;
}

/** Env allowlist, or a number that completed the code handshake. */
async function isAuthorizedSender(sender, config, client) {
  if (config.admins.includes(sender)) return true;
  const record = await client
    .fetch('*[_type == "whatsappAdmin" && phone == $phone][0]{verifiedAt}', { phone: sender })
    .catch(() => null);
  return Boolean(record?.verifiedAt);
}

/**
 * A text message is a verification attempt when it is the 6-digit code we
 * handed out for that sender. On a match the number becomes a publisher.
 */
async function verifyWhatsappCode(sender, text, client) {
  const code = String(text || "").trim();
  if (!/^\d{6}$/.test(code)) return null;

  const record = await client
    .fetch('*[_type == "whatsappAdmin" && phone == $phone][0]{_id, code, codeExpiresAt}', { phone: sender })
    .catch(() => null);
  if (!record?._id || record.code !== code) return null;
  if (record.codeExpiresAt && new Date(record.codeExpiresAt).getTime() < Date.now()) return null;

  await client
    .patch(record._id)
    .set({ verifiedAt: new Date().toISOString() })
    .unset(["code", "codeExpiresAt"])
    .commit();
  return sender;
}

/** Best-effort confirmation reply; never blocks publishing. */
async function sendWhatsappText(to, body, config) {
  if (!config.token || !config.phoneNumberId) return;
  await fetch(`${WHATSAPP_API}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  }).catch(() => {});
}

async function handleWhatsappPayload(body, config) {
  const client = sanityWriteClient();
  if (!client) throw new Error("Sanity write token is not configured");

  const results = [];
  const entries = Array.isArray(body?.entry) ? body.entry : [];

  for (const entry of entries) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      if (value?.metadata?.phone_number_id && config.phoneNumberId && value.metadata.phone_number_id !== config.phoneNumberId) {
        results.push({ skipped: "message belongs to another phone number" });
        continue;
      }

      for (const message of value?.messages || []) {
        const sender = normalizePhone(message?.from);

        // Verification comes first: this is how a number joins the allowlist
        // without anyone editing environment variables.
        if (message?.type === "text") {
          const verified = await verifyWhatsappCode(sender, message.text?.body, client);
          if (verified) {
            results.push({ verified: maskPhone(sender) });
            await sendWhatsappText(
              sender,
              "✅ Verified. Send a photo or video to publish it in the app's News.",
              config,
            );
          } else {
            results.push({ skipped: "text message without a matching verification code" });
          }
          continue;
        }

        if (!(await isAuthorizedSender(sender, config, client))) {
          // Anyone can find the business number; only verified admins publish.
          results.push({ skipped: "sender is not verified", from: maskPhone(sender) });
          continue;
        }

        try {
          results.push(await publishWhatsappMessage(message, client));
        } catch (error) {
          console.error("❌ [WHATSAPP] Could not publish message:", error);
          results.push({ error: error.message, from: maskPhone(sender) });
        }
      }
    }
  }

  return results;
}

// Meta's verification handshake, run once when the webhook URL is saved.
app.get("/api/whatsapp/webhook", (req, res) => {
  const { verifyToken } = whatsappConfig();
  if (!verifyToken) return res.status(503).send("WhatsApp gateway is not configured");

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verifyToken) {
    return res.status(200).send(String(challenge ?? ""));
  }
  return res.status(403).send("Verification failed");
});

// Configuration summary for the admin panel. Never returns secret values.
app.get("/api/whatsapp/status", async (req, res) => {
  const config = whatsappConfig();
  const client = sanityWriteClient();
  const baseUrl = (process.env.EXPO_PUBLIC_SERVER_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

  const numbers = client
    ? await client
        .fetch('*[_type == "whatsappAdmin" && defined(verifiedAt)] | order(verifiedAt desc){phone, verifiedAt}')
        .catch(() => [])
    : [];

  res.json({
    webhookUrl: `${baseUrl}/api/whatsapp/webhook`,
    businessNumber: process.env.WHATSAPP_BUSINESS_NUMBER || process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP || null,
    verifyTokenConfigured: Boolean(config.verifyToken),
    appSecretConfigured: Boolean(config.appSecret),
    accessTokenConfigured: Boolean(config.token),
    phoneNumberIdConfigured: Boolean(config.phoneNumberId),
    sanityWritable: Boolean(client),
    adminNumbers: config.admins.length,
    numbers: Array.isArray(numbers) ? numbers : [],
    ready: Boolean(
      config.verifyToken &&
        config.appSecret &&
        config.token &&
        (config.admins.length || numbers.length) &&
        client,
    ),
  });
});

// Step 1 of the connect flow: hand the admin a code to send from WhatsApp.
app.post("/api/whatsapp/verify/start", async (req, res) => {
  const client = sanityWriteClient();
  if (!client) return res.status(503).json({ error: "Sanity write access is not configured" });

  const phone = normalizePhone(req.body?.phone);
  if (phone.length < 8) {
    return res.status(400).json({ error: "Enter a phone number with the country code" });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();

  await client.createOrReplace({
    _id: `whatsapp-admin-${phone}`,
    _type: "whatsappAdmin",
    phone,
    code,
    codeExpiresAt: expiresAt,
    requestedAt: new Date().toISOString(),
  });

  res.json({
    phone,
    masked: maskPhone(phone),
    code,
    expiresAt,
    businessNumber: process.env.WHATSAPP_BUSINESS_NUMBER || process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP || null,
  });
});

// Forget a number: it can no longer publish until it verifies again.
app.delete("/api/whatsapp/numbers/:phone", async (req, res) => {
  const client = sanityWriteClient();
  if (!client) return res.status(503).json({ error: "Sanity write access is not configured" });

  const phone = normalizePhone(req.params.phone);
  await client.delete(`whatsapp-admin-${phone}`).catch(() => {});
  res.json({ removed: maskPhone(phone) });
});

app.post("/api/whatsapp/webhook", async (req, res) => {
  const config = whatsappConfig();

  if (!config.appSecret || !config.token) {
    return res.status(503).json({ error: "WhatsApp gateway is not configured" });
  }
  if (!verifyWhatsappSignature(req, config.appSecret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const results = await handleWhatsappPayload(req.body, config);
    res.status(200).json({ received: true, results });
  } catch (error) {
    console.error("❌ [WHATSAPP] Webhook failed:", error);
    // 200 keeps Meta from replaying a payload we already failed to process.
    res.status(200).json({ received: true, error: error.message });
  }
});

// Export for Vercel serverless deployment
export default app;

// Start server for local development. Vercel imports this module instead of
// running it, so keying off VERCEL (not NODE_ENV) keeps `npm run server`
// listening even when the environment is marked as production.
if (!process.env.VERCEL) {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
  });

  // Handle server errors
  server.on('error', (err) => {
    console.error('❌ Server error:', err);
  });


  // Keep server alive
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down server...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}