const { clerkClient } = require('@clerk/clerk-sdk-node');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { senderId, recipientId, amount, transferId } = req.body;

    // Validate input
    if (!senderId || !recipientId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid input parameters' });
    }

    // Get both users
    const [sender, recipient] = await Promise.all([
      clerkClient.users.getUser(senderId),
      clerkClient.users.getUser(recipientId)
    ]);

    // Check if sender has enough points
    const senderPoints = sender.unsafeMetadata?.points || 0;
    if (senderPoints < amount) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    // Check if recipient is in sender's friends list
    const senderFriends = sender.unsafeMetadata?.friends || [];
    const isFriend = senderFriends.some(friend => friend.clerkId === recipientId);

    if (!isFriend) {
      return res.status(403).json({ error: 'Recipient is not in your friends list' });
    }

    // Create transaction records
    const timestamp = new Date().toISOString();
    const transactionId = transferId || `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const senderTransaction = {
      id: transactionId,
      type: "spent",
      points: amount,
      description: `Överföring till användare ${recipientId.slice(-8)}`,
      date: timestamp,
    };

    const recipientTransaction = {
      id: transactionId,
      type: "earned",
      points: amount,
      description: `Mottagen överföring från ${sender.firstName || 'anonym användare'}`,
      date: timestamp,
    };

    // Update sender's points and transactions
    const senderCurrentTransactions = sender.unsafeMetadata?.transactions || [];
    const senderNewPoints = senderPoints - amount;

    await clerkClient.users.updateUser(senderId, {
      unsafeMetadata: {
        ...sender.unsafeMetadata,
        points: senderNewPoints,
        transactions: [senderTransaction, ...senderCurrentTransactions],
      },
    });

    // Update recipient's points and transactions
    const recipientCurrentPoints = recipient.unsafeMetadata?.points || 0;
    const recipientCurrentTransactions = recipient.unsafeMetadata?.transactions || [];
    const recipientNewPoints = recipientCurrentPoints + amount;

    await clerkClient.users.updateUser(recipientId, {
      unsafeMetadata: {
        ...recipient.unsafeMetadata,
        points: recipientNewPoints,
        transactions: [recipientTransaction, ...recipientCurrentTransactions],
      },
    });

    console.log(`✅ Points transfer completed: ${senderId} -> ${recipientId} (${amount} points)`);

    // Return success response
    return res.status(200).json({
      success: true,
      transferId: transactionId,
      senderNewPoints,
      recipientNewPoints,
      message: 'Points transferred successfully'
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}