
import { clerkClient } from "@clerk/clerk-sdk-node";

// POST /api/transfer-points
export async function POST(req: Request) {
  try {
    const { senderId, receiverId, amount, transferId } = await req.json();

    if (!senderId || !receiverId || !amount || amount <= 0) {
      return Response.json({ error: "Invalid data" }, { status: 400 });
    }

    // Get sender
    const sender = await clerkClient.users.getUser(senderId);
    const senderPoints = (sender.unsafeMetadata as any)?.points || 0;

    if (senderPoints < amount) {
      return Response.json({ error: "Not enough points" }, { status: 400 });
    }

    // Get receiver
    const receiver = await clerkClient.users.getUser(receiverId);
    const receiverPoints = (receiver.unsafeMetadata as any)?.points || 0;

    // Create transaction records
    const timestamp = new Date().toISOString();
    const transactionId = transferId || `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const senderTransaction = {
      id: transactionId,
      type: "spent" as const,
      points: amount,
      description: `Överföring till användare ${receiverId.slice(-8)}`,
      date: timestamp,
    };

    const receiverTransaction = {
      id: transactionId,
      type: "earned" as const,
      points: amount,
      description: `Mottagen överföring från ${senderId.slice(-8)}`,
      date: timestamp,
    };

    // Get existing transactions
    const senderTransactions = (sender.unsafeMetadata as any)?.transactions || [];
    const receiverTransactions = (receiver.unsafeMetadata as any)?.transactions || [];

    // Update sender
    await clerkClient.users.updateUser(senderId, {
      unsafeMetadata: {
        ...(sender.unsafeMetadata as any),
        points: senderPoints - amount,
        transactions: [senderTransaction, ...senderTransactions],
      },
    });

    // Update receiver
    await clerkClient.users.updateUser(receiverId, {
      unsafeMetadata: {
        ...(receiver.unsafeMetadata as any),
        points: receiverPoints + amount,
        transactions: [receiverTransaction, ...receiverTransactions],
      },
    });

    return Response.json({
      success: true,
      message: "Points transferred successfully",
      transferId: transactionId
    });
  } catch (err: any) {
    console.error("Transfer error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}