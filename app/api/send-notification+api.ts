
// import fetch from "node-fetch";
// const express = require("express");
// const app = express();
// app.use(express.json());

// // Expo server route to handle Sanity webhook
// app.post("/sendNotification", async (req: any, res: any) => {
//   try {
//     const doc = req.body; // Sanity sends the full document here

//     // Extract your schema fields (adjust names if different in your schema)
//     const { title, body: message, dateSent, pushData } = doc || {};

//     if (!title || !message) {
//       return res.status(400).json({ error: "Missing title or body" });
//     }

//     // Forward to Native Notify API
//     const response = await fetch("https://app.nativenotify.com/api/notification", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         appId: 32172,
//         appToken: "PNF5T5VibvtV6lj8i7pbil",
//         title,
//         body: message,
//         dateSent: new Date(dateSent || Date.now()).toLocaleString(),
//         ...(pushData ? { pushData } : {}),
//       }),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       return res.status(response.status).json({ error: errorText });
//     }

//     const data = await response.json();
//     return res.json({ success: true, data });
//   } catch (err: any) {
//     console.error("Error handling webhook:", err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// // Run locally (or deploy to server for Sanity webhook target)
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));