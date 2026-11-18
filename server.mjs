import express from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import os from "os";
import crypto from "node:crypto";
import { createClient } from "@sanity/client";
import { startBridge, bridgeInfo, bridgeStatus, requestPairingCode, sendBridgeText, logoutBridge } from "./whatsapp-bridge.mjs";

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
// Inbound WhatsApp media becomes News. The server holds a WhatsApp Web session
// (Baileys, Hermes-style): an allowlisted admin sends a photo or video to the
// linked business number, the media is copied into Sanity and published as an
// `announcement` — the same document the app's News tab already reads.
// No Meta app, no tokens, no webhook URL: pairing happens once by QR or code.

/** Cap inbound media at 16 MB. */
const WHATSAPP_MAX_BYTES = 16 * 1024 * 1024;

function whatsappConfig() {
  return {
    admins: (process.env.WHATSAPP_ADMIN_NUMBERS || "")
      .split(",")
      .map((number) => number.trim() === "*" ? "*" : number.replace(/[^0-9]/g, ""))
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

/** Turn one inbound photo/video into a published announcement. */
export async function publishWhatsappMedia({ from, messageId, kind, buffer, contentType, filename, caption }, client) {
  if (!buffer || !buffer.byteLength) return { skipped: "message carried no media" };
  if (buffer.byteLength > WHATSAPP_MAX_BYTES) return { skipped: "media is larger than 16 MB" };

  // One document per WhatsApp message: a retry or duplicate delivery must
  // update nothing rather than publish the same photo twice.
  const docId = `whatsapp-${String(messageId || Date.now()).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const existing = await client.getDocument(docId).catch(() => null);
  if (existing) return { skipped: "already published", docId };

  const safeName = String(filename || "").replace(/[^a-zA-Z0-9_.-]/g, "").slice(-64);
  const asset = await client.assets.upload(
    kind === "image" ? "image" : "file",
    buffer,
    { filename: safeName || `${docId}.${extensionFor(contentType)}`, contentType },
  );

  const cleanCaption = String(caption || "").trim();
  const title = cleanCaption.split("\n")[0].slice(0, 90).trim() || (kind === "image" ? "Nytt foto" : "Ny video");
  const publishedAt = new Date().toISOString();

  await client.createIfNotExists({
    _id: docId,
    _type: "announcement",
    title,
    slug: { _type: "slug", current: `${slugify(title) || "nytt-inlagg"}-${docId.slice(-6)}` },
    message: cleanCaption,
    description: cleanCaption,
    date: publishedAt,
    publishedAt,
    status: "published",
    isImportant: false,
    icon: "logo-whatsapp",
    source: "whatsapp",
    whatsappSender: from,
    media: {
      _type: "media",
      type: kind,
      ...(kind === "image"
        ? { image: { _type: "image", asset: { _type: "reference", _ref: asset._id } } }
        : { video: { _type: "file", asset: { _type: "reference", _ref: asset._id } } }),
    },
  });

  console.log(`✅ [WHATSAPP] Published ${kind} from ${from} as ${docId}`);
  return { docId };
}

function normalizePhone(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function maskPhone(phone) {
  const digits = normalizePhone(phone);
  return digits.length > 4 ? `${digits.slice(0, 3)}•••${digits.slice(-3)}` : digits;
}

/** Env allowlist, a number added through the panel, or "any number" mode. */
async function isAuthorizedSender(sender, config, client) {
  // `*` in WHATSAPP_ADMIN_NUMBERS, or the panel's "any number" switch.
  if (config.admins.includes("*")) return true;
  const settings = await client
    .fetch('*[_type == "whatsappSettings" && !(_id in path("drafts.**"))][0]{allowAll}')
    .catch(() => null);
  if (settings?.allowAll === true) return true;
  const record = await client
    .fetch('*[_type == "whatsappAdmin" && phone == $phone][0]{verifiedAt}', { phone: sender })
    .catch(() => null);
  return Boolean(record?.verifiedAt);
}

async function handleBridgeMessage({ from, messageId, kind, text, ...media }) {
  const client = sanityWriteClient();
  if (!client) {
    console.error("❌ [WHATSAPP] Sanity write token is not configured");
    return { error: "Sanity write token is not configured" };
  }
  const config = whatsappConfig();

  if (!(await isAuthorizedSender(from, config, client))) {
    // Anyone can find the business number; only allowed numbers publish.
    return { skipped: "sender is not allowed", from: maskPhone(from) };
  }

  // Plain texts never publish. The sender gets a hint back so they know
  // what to do; anything else is ignored quietly.
  if (kind === "text") {
    await sendBridgeText(from, "Send a photo or video here and it will be published in the app's News.");
    return { noted: "replied with a publishing hint" };
  }

  try {
    return await publishWhatsappMedia({ from, messageId, kind, ...media }, client);
  } catch (error) {
    console.error("❌ [WHATSAPP] Could not publish message:", error);
    return { error: error.message, from: maskPhone(from) };
  }
}

// QR for first-time pairing; null once the session is linked.
app.get("/api/whatsapp/qr", (req, res) => {
  res.json(bridgeStatus());
});

// Pairing-code login: returns an 8-digit code to enter on the phone at
// WhatsApp → Linked devices → Link with phone number instead.
app.post("/api/whatsapp/pair", async (req, res) => {
  try {
    const code = await requestPairingCode(req.body?.phone);
    console.log(`📱 [WHATSAPP] Pairing code issued for ${maskPhone(req.body?.phone)} — enter it on that phone now, it expires fast.`);
    res.json({ code });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Could not issue a pairing code" });
  }
});

// Log out and wipe the session so the server pairs fresh.
app.post("/api/whatsapp/logout", async (req, res) => {
  await logoutBridge();
  res.json({ loggedOut: true });
});

// Configuration summary for the admin panel. Never returns secret values.
app.get("/api/whatsapp/status", async (req, res) => {
  const config = whatsappConfig();
  const client = sanityWriteClient();
  const bridge = bridgeStatus();

  const numbers = client
    ? await client
        .fetch('*[_type == "whatsappAdmin" && defined(verifiedAt)] | order(verifiedAt desc){phone, verifiedAt}')
        .catch(() => [])
    : [];

  const settings = client
    ? await client
        .fetch('*[_type == "whatsappSettings" && !(_id in path("drafts.**"))][0]{allowAll}')
        .catch(() => null)
    : null;

  // A deployment can answer this endpoint while having no session at all;
  // say so explicitly instead of letting the panel spin forever.
  const bridgeActive = bridgeInfo().active;
  const bridgeNote = bridgeActive
    ? null
    : process.env.VERCEL
      ? `This server is a Vercel deployment, which cannot hold a WhatsApp session. Run the gateway with npm run server on your computer or an always-on host, and open this screen from there.`
      : process.env.WHATSAPP_BRIDGE_ENABLED === "false"
        ? "The WhatsApp session is disabled here (WHATSAPP_BRIDGE_ENABLED=false)."
        : "The WhatsApp session did not start — check the server log.";

  res.json({
    connected: bridge.connected,
    bridgeActive,
    bridgeNote,
    businessNumber: bridge.businessNumber || process.env.WHATSAPP_BUSINESS_NUMBER || null,
    lastError: bridge.lastError,
    sanityWritable: Boolean(client),
    allowAll: settings?.allowAll === true || config.admins.includes("*"),
    adminNumbers: config.admins.filter((number) => number !== "*").length,
    numbers: Array.isArray(numbers) ? numbers : [],
    ready: Boolean(bridge.connected && client),
  });
});

// "Any number may publish" — no list to maintain. Admin-gated by the app.
app.post("/api/whatsapp/settings", async (req, res) => {
  const client = sanityWriteClient();
  if (!client) return res.status(503).json({ error: "Sanity write access is not configured" });

  const allowAll = req.body?.allowAll === true;
  await client.createOrReplace({
    _id: "whatsapp-settings",
    _type: "whatsappSettings",
    allowAll,
    updatedAt: new Date().toISOString(),
  });

  res.json({ allowAll });
});

// The panel is admin-gated and Meta asserts the sender number on every
// delivery, so adding a number here is all it takes: only the real owner of
// that number can publish from it. No codes, no expiry, nothing to type on
// the phone.
app.post("/api/whatsapp/numbers", async (req, res) => {
  const client = sanityWriteClient();
  if (!client) return res.status(503).json({ error: "Sanity write access is not configured" });

  const phone = normalizePhone(req.body?.phone);
  if (phone.length < 8) {
    return res.status(400).json({ error: "Enter a phone number with the country code" });
  }

  await client.createOrReplace({
    _id: `whatsapp-admin-${phone}`,
    _type: "whatsappAdmin",
    phone,
    verifiedAt: new Date().toISOString(),
    requestedAt: new Date().toISOString(),
  });

  res.json({
    phone,
    masked: maskPhone(phone),
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

// The bridge holds a live WhatsApp Web session, so it only starts where the
// process stays up (local `npm run server`, a VPS, …). Vercel serverless
// cannot keep the socket, so it skips the bridge and only serves the API.
/**
 * Start the session only once this process owns the port. If another server is
 * already listening, that one answers the app — starting a second session here
 * would just fight it for the same stored credentials.
 */
function startWhatsappBridge() {
  if (process.env.VERCEL) {
    console.log("ℹ️  [WHATSAPP] Vercel cannot hold a WhatsApp session — the bridge is skipped here. Run `npm run server` on an always-on host to link and publish.");
    return;
  }
  if (process.env.WHATSAPP_BRIDGE_ENABLED === "false") {
    console.log("ℹ️  [WHATSAPP] Bridge disabled by WHATSAPP_BRIDGE_ENABLED=false.");
    return;
  }
  console.log("🔌 [WHATSAPP] Starting the WhatsApp session (scan the QR in the admin panel)…");
  startBridge({
    onMessage: async (payload) => {
      try {
        await handleBridgeMessage(payload);
      } catch (error) {
        console.error("❌ [WHATSAPP] Could not handle a message:", error?.message || error);
      }
    },
  });
}

// Export for Vercel serverless deployment
export default app;

// Start server for local development. Vercel imports this module instead of
// running it, so keying off VERCEL (not NODE_ENV) keeps `npm run server`
// listening even when the environment is marked as production.
if (!process.env.VERCEL) {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    startWhatsappBridge();
  });

  // Handle server errors
  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use — an older server is still running there.`);
      console.error('   The app talks to that process, so this one can never link WhatsApp.');
      console.error(`   Fix it:  lsof -ti:${PORT} | xargs kill`);
      console.error('   Then:    npm run server\n');
      process.exit(1);
    }
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