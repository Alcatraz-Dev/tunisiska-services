/**
 * Broadcast for things the app publishes to every customer.
 *
 * News and new departures are created straight from the admin panel, with no
 * notification composer step behind them, so publishing also writes the inbox
 * row and pushes it to every registered device. Delivery is best effort: the
 * content is already saved, and a failed send must never undo that.
 */
import { client } from "@/sanityClient";
import { buildPushMessages } from "@/app/lib/pushPayload";

export type BroadcastResult = {
  documentId: string;
  delivered: number;
  failed: number;
};

export type BroadcastContent = {
  title: string;
  message: string;
  /** Matches a `NotificationType`; drives the icon in the inbox. */
  type: string;
  imageUrl?: string;
};

/** Expo issues both `ExponentPushToken[...]` and `ExpoPushToken[...]`. */
const isExpoToken = (token: unknown): token is string =>
  typeof token === "string" &&
  /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token.trim());

export async function broadcastToAllUsers(
  input: BroadcastContent,
): Promise<BroadcastResult> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("A broadcast needs a title before it can be sent");
  }

  const message = input.message.trim() || title;

  // Saved before sending so the inbox row exists even when no device is
  // registered yet, and so the push can carry the row id.
  const document = await client.create({
    _type: "notificationHistory",
    title,
    message,
    type: input.type,
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    sentAt: new Date().toISOString(),
    status: "sending",
  });

  const documentId = document._id;
  let delivered = 0;
  let failed = 0;

  try {
    const users = await client.fetch<
      { _id: string; expoPushToken?: string }[]
    >('*[_type == "users" && defined(expoPushToken)]{ _id, expoPushToken }');

    const ownersByToken = new Map<string, string[]>();
    users.forEach((user) => {
      const token = user.expoPushToken?.trim();
      if (!isExpoToken(token)) return;
      ownersByToken.set(token, [
        ...(ownersByToken.get(token) ?? []),
        user._id,
      ]);
    });

    const tokens = Array.from(ownersByToken.keys());
    const deadTokens: string[] = [];

    // Expo accepts at most 100 messages per request and answers with one
    // ticket per message, so a 200 response can still contain per-device errors.
    for (let index = 0; index < tokens.length; index += 100) {
      const chunk = tokens.slice(index, index + 100);

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildPushMessages(chunk, {
            title,
            message,
            type: input.type,
            notificationId: documentId,
            imageUrl: input.imageUrl,
          }),
        ),
      });

      if (!response.ok) {
        failed += chunk.length;
        continue;
      }

      const payload = await response.json().catch(() => null);
      const tickets: any[] = Array.isArray(payload?.data) ? payload.data : [];

      if (tickets.length !== chunk.length) {
        failed += chunk.length;
        continue;
      }

      tickets.forEach((ticket, ticketIndex) => {
        if (ticket?.status === "ok") {
          delivered += 1;
          return;
        }
        failed += 1;
        if (ticket?.details?.error === "DeviceNotRegistered") {
          deadTokens.push(chunk[ticketIndex]);
        }
      });
    }

    // Forget tokens Expo says no longer exist, so they stop failing.
    for (const token of deadTokens) {
      for (const userId of ownersByToken.get(token) ?? []) {
        await client
          .patch(userId)
          .unset(["expoPushToken"])
          .commit()
          .catch(() => {});
      }
    }
  } catch (error) {
    console.warn("Broadcast push failed:", error);
  }

  const status =
    delivered > 0 ? "sent" : failed > 0 ? "failed_push" : "history_only";

  await client
    .patch(documentId)
    .set({ status, delivered, failed })
    .commit()
    .catch(() => {});

  return { documentId, delivered, failed };
}

/** A published announcement becomes a news notification. */
export async function broadcastAnnouncement(input: {
  title: string;
  message?: string;
  imageUrl?: string;
}): Promise<BroadcastResult> {
  return broadcastToAllUsers({
    title: input.title,
    message: input.message ?? "",
    type: "announcement",
    imageUrl: input.imageUrl,
  });
}
