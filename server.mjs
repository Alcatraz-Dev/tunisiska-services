import express from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import os from "os";

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
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`📱 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
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

// Export for Vercel serverless deployment
export default app;

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
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