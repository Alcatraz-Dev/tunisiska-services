# WhatsApp gateway

An allowlisted admin sends a photo or video to the business WhatsApp number; the
media is copied into Sanity and published as an `announcement`, which is exactly
what the app's News tab renders.

```
WhatsApp ──► Meta Cloud API ──► POST /api/whatsapp/webhook (server.mjs)
                                   │ verify X-Hub-Signature-256
                                   │ check sender against WHATSAPP_ADMIN_NUMBERS
                                   │ GET graph.facebook.com/<media-id> → bytes
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
| GET | `/api/whatsapp/webhook` | Meta's verification handshake (echoes `hub.challenge` when the token matches). |
| POST | `/api/whatsapp/webhook` | Delivery of inbound messages. 401 on a bad signature, 200 for anything accepted or ignored. |
| GET | `/api/whatsapp/status` | Configuration summary, business number and verified numbers for the admin panel. |
| POST | `/api/whatsapp/verify/start` | Issues a 6-digit code for a phone number (`{ "phone": "+46…" }`). |
| DELETE | `/api/whatsapp/numbers/:phone` | Revokes a number so it can no longer publish. |

Meta retries deliveries, so each message maps to a deterministic document id
(`whatsapp-<message id>`): a retry is skipped instead of publishing twice.

## Connecting a number

The panel needs no tokens or webhook values:

1. Enter the WhatsApp number that should be allowed to publish.
2. Send the 6-digit code the panel shows from that number to the business
   number.
3. The webhook matches the code, records `verifiedAt` on a `whatsappAdmin`
   document and the panel flips to Connected. Codes expire after 10 minutes.
4. After that, any photo or video that number sends is published in News.
   Removing the number in the panel takes the permission away again.

Numbers listed in `WHATSAPP_ADMIN_NUMBERS` are allowed without verification, so
the business owner can be bootstrapped before the webhook is live.

## Environment

Copy `.env.whatsapp.example` into `.env` and fill it in. The gateway reports
`ready` in the admin panel only when the token, phone number id, verify token,
app secret, at least one admin number and a writable Sanity token are present.

## Which host receives the webhook

The callback must reach **this Express server**, not the marketing site:

- API server: `https://tunisiska-services.vercel.app` (this repo, `server.mjs`)
- Landing page: `https://tunisiska-mega-services.vercel.app` — a Next.js marketing
  build with no API routes; every `/api/*` path there answers 404.

So the production webhook is:

```
https://tunisiska-services.vercel.app/api/whatsapp/webhook
```

If the callback has to live on the branded domain, the landing project needs a
rewrite (that is a different repository):

```json
{
  "rewrites": [
    {
      "source": "/api/whatsapp/:path*",
      "destination": "https://tunisiska-services.vercel.app/api/whatsapp/:path*"
    }
  ]
}
```

The proxy must forward the body byte-for-byte, otherwise the HMAC check fails.
If it does, replace the rewrite with a route handler that forwards
`await request.text()` together with the original `x-hub-signature-256` header.

## Verifying without Meta

```bash
npm run whatsapp:test   # boots the server against a stand-in Graph API
```

The self-test covers the handshake, signature rejection, the admin allowlist,
media download, Sanity upload, the published document, its visibility to the
news query and retry idempotency, then deletes what it created.
