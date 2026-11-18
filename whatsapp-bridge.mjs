/**
 * WhatsApp bridge (Hermes-style): a WhatsApp Web session linked to a phone
 * number, no Meta app, no tokens, no webhook URL.
 *
 * - First run: scan the QR (shown in the terminal and in the admin panel) from
 *   WhatsApp → Linked devices, or ask for an 8-digit pairing code for a phone
 *   number and enter it on the phone instead.
 * - The session persists in baileys-auth/, so pairing happens once.
 * - Inbound photos/videos from allowlisted numbers are handed to `onMessage`.
 *
 * Baileys speaks an unofficial protocol: use a dedicated business number, not
 * a personal account, because WhatsApp may restrict automated sessions.
 */
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import fs from "node:fs";

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || "./baileys-auth";

let sock = null;
let starting = null;
let connected = false;
let businessNumber = "";
let qrDataUrl = "";
let lastError = "";

function digitsOf(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

/** Who sent this DM, as country-code digits — null when it cannot be told. */
function senderOf(msg) {
  const jid = String(msg?.key?.remoteJid || "");
  if (jid === "status@broadcast") return null;
  if (jid.endsWith("@g.us")) return null; // groups never publish
  if (jid.endsWith("@s.whatsapp.net")) {
    const digits = digitsOf(jid.split("@")[0].split(":")[0]);
    return digits.length >= 8 ? digits : null;
  }
  // Privacy-numbered chats expose the real number on the key.
  const fallback = digitsOf(msg?.key?.senderPn || "");
  return fallback.length >= 8 ? fallback : null;
}

/** Unwrap ephemeral / view-once containers to the real payload. */
function unwrap(message) {
  let inner = message;
  for (let depth = 0; depth < 3 && inner; depth += 1) {
    if (inner.ephemeralMessage?.message) inner = inner.ephemeralMessage.message;
    else if (inner.viewOnceMessage?.message) inner = inner.viewOnceMessage.message;
    else if (inner.viewOnceMessageV2?.message) inner = inner.viewOnceMessageV2.message;
    else break;
  }
  return inner;
}

/** The photo/video attached to a message, if any. */
function mediaOf(msg) {
  const message = unwrap(msg?.message);
  if (!message) return null;
  if (message.imageMessage) {
    return { kind: "image", caption: message.imageMessage.caption };
  }
  if (message.videoMessage) {
    return { kind: "video", caption: message.videoMessage.caption };
  }
  const mime = String(message.documentMessage?.mimetype || "");
  if (message.documentMessage && (mime.startsWith("image/") || mime.startsWith("video/"))) {
    return {
      kind: mime.startsWith("video/") ? "video" : "image",
      caption: message.documentMessage.caption,
      filename: message.documentMessage.fileName,
    };
  }
  return null;
}

async function renderQr(qr) {
  try {
    qrDataUrl = await QRCode.toDataURL(qr, { width: 264, margin: 1 });
  } catch {
    qrDataUrl = "";
  }
}

function ownNumber() {
  const id = sock?.user?.id || "";
  return digitsOf(id.split("@")[0].split(":")[0]);
}

async function connect(onMessage) {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

  sock = makeWASocket({
    auth: state,
    ...(version ? { version } : {}),
    browser: ["Tunisiska Services", "Chrome", "1.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) await renderQr(qr);
    if (connection === "open") {
      connected = true;
      qrDataUrl = "";
      lastError = "";
      businessNumber = ownNumber();
      console.log(`✅ [WHATSAPP] Linked as +${businessNumber || "unknown"}`);
    }
    if (connection === "close") {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        // Pairing was revoked on the phone: wipe and wait for a fresh pair.
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        } catch {}
        sock = null;
        starting = null;
        console.log("⚠️ [WHATSAPP] Logged out — scan a new QR or pair again.");
        return;
      }
      // Transient drop: reconnect after a pause.
      console.log(`⚠️ [WHATSAPP] Disconnected (${code || "unknown"}) — retrying…`);
      lastError = `disconnected (${code || "unknown"})`;
      sock = null;
      starting = null;
      setTimeout(() => {
        startBridge({ onMessage }).catch((error) => {
          console.error("❌ [WHATSAPP] Reconnect failed:", error?.message || error);
        });
      }, 5000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages || []) {
      try {
        if (!msg?.message || msg.key?.fromMe) continue;
        const from = senderOf(msg);
        if (!from) continue;
        const attached = mediaOf(msg);
        const text = unwrap(msg.message)?.conversation
          || unwrap(msg.message)?.extendedTextMessage?.text
          || "";
        const messageId = String(msg.key?.id || `${Date.now()}`);
        if (attached) {
          const buffer = await downloadMediaMessage(msg, "buffer", {});
          await onMessage({
            from,
            messageId,
            kind: attached.kind,
            buffer: Buffer.from(buffer),
            contentType: attached.kind === "image" ? "image/jpeg" : "video/mp4",
            filename: attached.filename,
            caption: String(attached.caption || ""),
            pushName: msg.pushName,
          });
        } else if (String(text).trim()) {
          await onMessage({ from, messageId, kind: "text", text: String(text).trim(), pushName: msg.pushName });
        }
      } catch (error) {
        console.error("❌ [WHATSAPP] Could not handle a message:", error?.message || error);
      }
    }
  });
}

/** Start (or reuse) the session. Safe to call repeatedly. */
export function startBridge({ onMessage }) {
  if (sock && connected) return Promise.resolve();
  if (starting) return starting;
  starting = connect(onMessage).catch((error) => {
    starting = null;
    lastError = error?.message || String(error);
    console.error("❌ [WHATSAPP] Could not start:", lastError);
  });
  return starting;
}

export function bridgeStatus() {
  return {
    connected,
    businessNumber: businessNumber || null,
    qr: connected ? null : qrDataUrl || null,
    lastError: lastError || null,
  };
}

/**
 * Pairing-code login: enter the returned 8-digit code on the phone at
 * WhatsApp → Linked devices → Link with phone number instead.
 */
export async function requestPairingCode(phone) {
  const digits = digitsOf(phone);
  if (digits.length < 8) throw new Error("Enter a phone number with the country code.");
  await startBridge({ onMessage: async () => {} });
  if (!sock) throw new Error("The WhatsApp session is not running.");
  if (sock.authState?.creds?.registered) throw new Error("This server is already linked — log out first to re-pair.");
  // WhatsApp consumes exactly 8 characters (e.g. "3F7K9Q2M"); show them as-is.
  const code = String(await sock.requestPairingCode(digits)).toUpperCase();
  if (code.length !== 8) throw new Error(`WhatsApp returned an unexpected pairing code (${code.length} characters)`);
  return code;
}

/** Best-effort outbound text (confirmations, hints). Never throws. */
export async function sendBridgeText(to, body) {
  try {
    if (!sock || !connected) return;
    await sock.sendMessage(`${digitsOf(to)}@s.whatsapp.net`, { text: body });
  } catch {}
}

/** Log out and wipe the session so the next start pairs fresh. */
export async function logoutBridge() {
  try {
    await sock?.logout();
  } catch {}
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  } catch {}
  sock = null;
  starting = null;
  connected = false;
  businessNumber = "";
  qrDataUrl = "";
}
