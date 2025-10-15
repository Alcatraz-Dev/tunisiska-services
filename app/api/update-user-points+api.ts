import { clerkClient } from '@clerk/clerk-sdk-node';

interface UpdatePointsRequest {
  userId: string;
  pointsToAdd: number;
  description: string;
  senderId?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, pointsToAdd, description, senderId }: UpdatePointsRequest & { senderId?: string } = body;

    if (!userId || typeof pointsToAdd !== 'number') {
      return Response.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Get recipient's current data
    const recipientUser = await clerkClient.users.getUser(userId);
    const recipientCurrentPoints = (recipientUser.unsafeMetadata as any)?.points || 0;
    const recipientNewPoints = recipientCurrentPoints + pointsToAdd;

    // Update recipient's points
    await clerkClient.users.updateUser(userId, {
      unsafeMetadata: {
        ...(recipientUser.unsafeMetadata as any),
        points: recipientNewPoints ,
      }
    });

    // Add transaction record for recipient (limit to prevent size issues)
    const recipientTransactions = (recipientUser.unsafeMetadata as any)?.transactions || [];
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
        ...(recipientUser.unsafeMetadata as any),
        transactions: limitedTransactions,
      }
    });

    // If this is a transfer, also update sender's points (deduct)
    if (senderId && pointsToAdd > 0) {
      try {
        const senderUser = await clerkClient.users.getUser(senderId);
        const senderCurrentPoints = (senderUser.unsafeMetadata as any)?.points || 0;
        const senderNewPoints = senderCurrentPoints - pointsToAdd;

        // Update sender's points
        await clerkClient.users.updateUser(senderId, {
          unsafeMetadata: {
            ...(senderUser.unsafeMetadata as any),
            points: senderNewPoints,
          }
        });

        // Add transaction record for sender
        const senderTransactions = (senderUser.unsafeMetadata as any)?.transactions || [];
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
            ...(senderUser.unsafeMetadata as any),
            transactions: limitedSenderTransactions,
          }
        });

        console.log(`✅ Updated sender ${senderId}: ${senderCurrentPoints} -> ${senderNewPoints} points`);
      } catch (senderError) {
        console.error('❌ Error updating sender points:', senderError);
        // Don't fail the entire request if sender update fails
      }
    }

    // Also update points in Sanity database
    try {
      const { createClient } = await import('@sanity/client');
      const client = createClient({
        projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
        useCdn: false,
        token: process.env.SANITY_AUTH_TOKEN,
        apiVersion: '2024-01-01',
      });

      // Find user document in Sanity
      const userDoc = await client.fetch(
        `*[_type == "users" && clerkId == $clerkId][0]`,
        { clerkId: userId }
      );

      if (userDoc) {
        // Update points in Sanity
        await client
          .patch(userDoc._id)
          .set({ points: recipientNewPoints })
          .commit();
      } else {
        // Create user document if it doesn't exist
        await client.create({
          _type: 'users',
          clerkId: userId,
          email: recipientUser.emailAddresses?.[0]?.emailAddress || '',
          points: recipientNewPoints,
        });
      }

      console.log(`✅ Updated Sanity points for user ${userId}: ${recipientNewPoints}`);
    } catch (sanityError) {
      console.error('❌ Error updating Sanity points:', sanityError);
      // Don't fail the entire request if Sanity update fails
    }

    console.log(`✅ Updated user ${userId}: ${recipientCurrentPoints} -> ${recipientNewPoints} points`);

    return Response.json({
      success: true,
      newPoints: recipientNewPoints,
      message: `Successfully added ${pointsToAdd} points to user ${userId}`
    });

  } catch (error: any) {
    console.error('❌ Error updating user points:', error);
    return Response.json(
      { error: 'Failed to update user points', details: error.message },
      { status: 500 }
    );
  }
}