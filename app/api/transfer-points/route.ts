
import { clerkClient } from "@clerk/clerk-sdk-node";

// POST /api/transfer-points
export async function POST(req: Request) {
  try {
    const { senderId, receiverId, amount } = await req.json();

    if (!senderId || !receiverId || !amount || amount <= 0) {
      return Response.json({ error: "Invalid data" }, { status: 400 });
    }

    // Get sender
    const sender = await clerkClient.users.getUser(senderId);
    const senderPoints = sender.unsafeMetadata?.points || 0;

    if (senderPoints < amount) {
      return Response.json({ error: "Not enough points" }, { status: 400 });
    }

    // Get receiver
    const receiver = await clerkClient.users.getUser(receiverId);
    const receiverPoints = receiver.unsafeMetadata?.points || 0;

    // Update points
    await clerkClient.users.updateUser(senderId, {
      unsafeMetadata: {
        ...sender.unsafeMetadata,
        points: senderPoints as any - amount,
      },
    });

    await clerkClient.users.updateUser(receiverId, {
      unsafeMetadata: {
        ...receiver.unsafeMetadata,
        points: receiverPoints + amount,
      },
    });

    return Response.json({ success: true, message: "Points transferred" });
  } catch (err: any) {
    console.error("Transfer error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}