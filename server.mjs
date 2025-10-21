import express from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import os from "os";

dotenv.config();

const app = express();

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

// Diagnostic logs for payment endpoints
console.log("🔍 [DIAGNOSTIC] STRIPE_SECRET_KEY present:", !!STRIPE_SECRET_KEY);
console.log("🔍 [DIAGNOSTIC] STRIPE_SECRET_KEY length:", STRIPE_SECRET_KEY ? STRIPE_SECRET_KEY.length : 0);
console.log("🔍 [DIAGNOSTIC] EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY present:", !!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
console.log("🔍 [DIAGNOSTIC] NODE_ENV:", process.env.NODE_ENV);
console.log("🔍 [DIAGNOSTIC] PORT:", PORT);

// Payment sheet endpoint (for native apps)
app.post("/payment-sheet", async (req, res) => {
  console.log("🔍 [DIAGNOSTIC] /payment-sheet called with:", { amount: req.body.amount, currency: req.body.currency });
  try {
    const { amount, currency } = req.body;

    if (!amount) {
      console.log("❌ [DIAGNOSTIC] Amount missing in /payment-sheet");
      return res.status(400).json({ error: "Amount is required" });
    }

    const usedCurrency = currency || "sek";
    console.log("🔍 [DIAGNOSTIC] Using currency:", usedCurrency);

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

    console.log("🔍 [DIAGNOSTIC] Creating Stripe customer...");
    const customer = await stripe.customers.create();
    console.log("✅ [DIAGNOSTIC] Customer created:", customer.id);

    console.log("🔍 [DIAGNOSTIC] Creating ephemeral key...");
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2024-09-30.acacia" }
    );
    console.log("✅ [DIAGNOSTIC] Ephemeral key created");

    // Convert amount to smallest currency unit (öre for SEK)
    const stripeAmount = usedCurrency === "sek" ? amount * 100 : amount;
    console.log("🔍 [DIAGNOSTIC] Stripe amount (converted):", stripeAmount);

    console.log("🔍 [DIAGNOSTIC] Creating payment intent...");
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: usedCurrency,
      customer: customer.id,
      payment_method_types: paymentMethodTypes,
      metadata: { integration: "mobile_payment_sheet" }
    });
    console.log("✅ [DIAGNOSTIC] Payment intent created:", paymentIntent.id);

    console.log("🔍 [DIAGNOSTIC] Sending response with publishable key present:", !!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
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
  console.log("🔍 [DIAGNOSTIC] /create-checkout-session called with:", { amount: req.body.amount, currency: req.body.currency, points: req.body.points, service: req.body.service, isWallet: req.body.isWallet });
  try {
    const { amount, currency, successUrl, cancelUrl, points, service, isWallet } = req.body;
    console.log("📡 [SERVER] Received checkout request:", { amount, currency, points, service, isWallet });

    if (!amount) {
      console.log("❌ [DIAGNOSTIC] Amount missing in /create-checkout-session");
      return res.status(400).json({ error: "Amount is required" });
    }

    const usedCurrency = currency || "sek";
    // Amount is already in cents from the client
    const stripeAmount = amount;
    console.log("💰 [SERVER] Stripe amount (cents):", stripeAmount);
    console.log("🔍 [DIAGNOSTIC] Using currency:", usedCurrency);
    console.log("🔍 [DIAGNOSTIC] isWallet value:", isWallet, "type:", typeof isWallet);

    const displayAmount = (amount / 100).toFixed(2);
    const displayPoints = points || Math.round(amount / 100);
    const displayService = service || "Tjänst";
    console.log("🎯 [SERVER] Display amount:", displayAmount, "Display points:", displayPoints, "Display service:", displayService);

    console.log("🔍 [DIAGNOSTIC] Creating checkout session...");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: usedCurrency,
            product_data: {
              name: isWallet ? `${displayPoints} poäng - Tunisiska Services` : `${displayService} - Tunisiska Services`,
              description: isWallet ? `Få ${displayPoints} poäng att använda i appen - ${displayAmount} ${usedCurrency.toUpperCase()}` : `Betalning för ${displayService} tjänst - ${displayAmount} ${usedCurrency.toUpperCase()}`,
            },
            unit_amount: stripeAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `tunisiska-services://success?session_id={CHECKOUT_SESSION_ID}&points=${displayPoints}&amount=${displayAmount}`,
      cancel_url: cancelUrl || `tunisiska-services://cancel`,
      metadata: {
        integration: "web_checkout",
        points: displayPoints.toString(),
        amount_sek: displayAmount
      }
    });

    console.log("✅ [SERVER] Checkout session created:", session.id, "URL:", session.url);
    console.log("🔍 [DIAGNOSTIC] Session URL present:", !!session.url);
    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (err) {
    console.error("❌ [SERVER] Checkout session error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Expo Push Notification helper
import pkg from 'expo-server-sdk';
const { Expo, ExpoPushMessage, ExpoPushToken } = pkg;

// Initialize Expo SDK
const expo = new Expo();

// API endpoint for sending Expo push notifications with images
app.post("/api/send-expo-notification", async (req, res) => {
  try {
    const { expoPushToken, title, message, image, data } = req.body;

    if (!expoPushToken || !title || !message) {
      return res.status(400).json({
        error: 'Missing required fields: expoPushToken, title, message'
      });
    }

    // Check if the token is valid
    if (!Expo.isExpoPushToken(expoPushToken)) {
      return res.status(400).json({
        error: 'Invalid Expo push token'
      });
    }

    // Create the notification message
    const notificationMessage = {
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: message,
      data: data || {},
      // Add image support for Expo Go
      ...(image && { image: image }),
    };

    console.log('📤 Sending Expo notification:', {
      token: expoPushToken.substring(0, 20) + '...',
      title,
      message,
      hasImage: !!image,
      image: image ? image.substring(0, 50) + '...' : null
    });

    // Send the notification
    const chunks = expo.chunkPushNotifications([notificationMessage]);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log('✅ Notification chunk sent successfully');
      } catch (error) {
        console.error('❌ Error sending notification chunk:', error);
        return res.status(500).json({
          error: 'Failed to send notification',
          details: error.message
        });
      }
    }

    // Check for any errors in the tickets
    const errors = [];
    for (let ticket of tickets) {
      if (ticket.status === 'error') {
        errors.push({
          token: expoPushToken,
          message: ticket.message,
          details: ticket.details
        });
      }
    }

    if (errors.length > 0) {
      console.warn('⚠️ Some notifications failed:', errors);
      return res.status(207).json({
        success: false,
        message: 'Some notifications failed to send',
        errors,
        tickets
      });
    }

    console.log('✅ All notifications sent successfully');
    res.json({
      success: true,
      message: 'Notification sent successfully',
      tickets
    });

  } catch (error) {
    console.error('❌ Error in send-expo-notification endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
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


  app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  // Keep server alive
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down server...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}