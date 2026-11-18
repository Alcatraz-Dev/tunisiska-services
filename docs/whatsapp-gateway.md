# WhatsApp gateway

An allowed admin sends a photo or video to the business WhatsApp number; the
media is copied into Sanity and published as an `announcement`, which is exactly
what the app's News tab renders.

There is **no Meta app, no token and no webhook**. The server holds a WhatsApp
Web session (Baileys, Hermes-style) linked to a phone number — the same way
WhatsApp Web on a computer stays linked to a phone.

```
WhatsApp ──► linked session (server.mjs + whatsapp-bridge.mjs)
                                   │ check sender against the allowlist
                                   │ download media from the session
                                   ▼
                              Sanity asset upload ──► announcement (status: published,
                                                       source: whatsapp)
                                                              │
                                                              ▼
                                                        News tab / admin panel
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/whatsapp/status` | Session state, business number and allowed numbers for the admin panel. |
| GET | `/api/whatsapp/qr` | Fresh QR code for linking (null once linked). |
| POST | `/api/whatsapp/pair` | Issues an 8-digit pairing code for a phone number (`{ "phone": "+46…" }`). |
| POST | `/api/whatsapp/logout` | Unlinks the session so the server pairs fresh. |
| POST | `/api/whatsapp/settings` | Any-number mode (`{ "allowAll": true }`). |
| POST | `/api/whatsapp/numbers` | Adds a number to the allowlist (`{ "phone": "+46…" }`). |
| DELETE | `/api/whatsapp/numbers/:phone` | Revokes a number so it can no longer publish. |

Each message maps to a deterministic document id (`whatsapp-<message id>`): a
duplicate delivery is skipped instead of publishing twice.

## Linking a number

1. Start the server (`npm run server`) and open Operations → WhatsApp news in
   the app.
2. Scan the QR: on the phone, WhatsApp → Linked devices → Link a device.
3. No camera handy? Enter the business number, tap Get code, and enter the
   8-digit code on the phone at Linked devices → Link with phone number.
4. The session is saved in `baileys-auth/`, so linking happens once — restarts
   reconnect on their own.

Then choose who may publish, in the same panel section:

- **Any WhatsApp number** (toggle on) — no list to maintain; every number that
  sends a photo or video to the linked number is published.
- **Only the numbers you add** (toggle off) — the default; add each number that
  may publish.

Plain texts never publish; the sender gets a short hint back explaining what to
send. Photos and videos sent as documents publish too.

Numbers listed in `WHATSAPP_ADMIN_NUMBERS` are allowed without using the panel,
and `*` there turns on "any number" mode from the environment.

## Where the gateway runs

The session needs a process that **stays up**: your computer (`npm run server`),
a VPS, Railway, Render, … Vercel serverless cannot hold the socket, so the
deployed build skips the bridge and only serves the API — pair and manage
numbers from a dev build that reaches your always-on server.

Keep `baileys-auth/` out of git (it is ignored): it contains the session, the
equivalent of a logged-in WhatsApp Web.

## A note on ban risk

Baileys speaks an unofficial protocol — WhatsApp does not support bots outside
the Business API. Use a **dedicated business number**, not a personal account,
and keep the traffic to what the feature needs (publishing News). If WhatsApp
ever unlinks the session, the panel shows Not linked and you pair again.

## If nothing arrives

1. **Server running?** The panel must say Connected. Server offline → start it.
2. **Right number?** Media must go to the *linked* business number shown in the
   panel — not to another number, not to a group.
3. **Number allowed?** The sender must be in Allowed numbers (or
   `WHATSAPP_ADMIN_NUMBERS`).
4. **Sanity token?** Without `EXPO_PUBLIC_SANITY_TOKEN` the media cannot be
   uploaded; the server log says so.
5. **Still on the phone?** If the session was removed under Linked devices, the
   panel flips back to Not linked — scan again.

## Verifying without WhatsApp

```bash
npm run whatsapp:test   # boots the server with the session disabled
```

The self-test covers the status and QR endpoints, input validation, adding a
number, the full publish pipeline (media → announcement → news query →
idempotency), revocation, then deletes what it created.
