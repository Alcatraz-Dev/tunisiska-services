
import { clerkClient } from '@clerk/clerk-sdk-node';

interface UpdatePointsRequest {
  userId: string;
  pointsToAdd: number;
  description: string;
}

export async function POST(request: Request) {
  try {
    const { userId, pointsToAdd, description }: UpdatePointsRequest = await request.json();

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
        points: recipientNewPoints,
      }
    });

    // Add transaction record for recipient
    const recipientTransactions = (recipientUser.unsafeMetadata as any)?.transactions || [];
    recipientTransactions.unshift({
      id: `received_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "earned",
      points: pointsToAdd,
      description: description,
      date: new Date().toISOString(),
    });

    await clerkClient.users.updateUser(userId, {
      unsafeMetadata: {
        ...(recipientUser.unsafeMetadata as any),
        transactions: recipientTransactions,
      }
    });

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