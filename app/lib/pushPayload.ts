/**
 * Expo push payload for an admin notification.
 *
 * Pure and dependency-free so it can be exercised outside React Native. Media
 * travels twice on purpose:
 *  - `data` is what the app reads when it receives the push, so the inbox row
 *    shows the photo/video immediately, before the next Sanity sync.
 *  - `richContent.image` lets Android render the picture inside the tray
 *    notification. iOS cannot attach a remote image to a push without a
 *    Notification Service Extension, so there the text is what the tray shows
 *    and the media appears in the app.
 */
export type PushContent = {
  title: string;
  message: string;
  type: string;
  notificationId: string;
  route?: string;
  imageUrl?: string;
  videoUrl?: string;
};

export type PushMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: Record<string, string>;
  richContent?: { image: string };
};

export type PushMedia = {
  image?: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
};

/** What the receiving app stores on the inbox item for a delivered push. */
export function readPushMedia(data: Record<string, any> = {}): PushMedia {
  const image = data.imageUrl ?? data.image;
  const videoUrl = data.videoUrl ?? data.video;
  const mediaType = data.mediaType ?? (videoUrl ? "video" : image ? "image" : undefined);

  return {
    ...(image ? { image } : {}),
    ...(videoUrl ? { videoUrl } : {}),
    ...(mediaType ? { mediaType } : {}),
  };
}

export function pushMediaType(content: PushContent): "image" | "video" | undefined {
  if (content.videoUrl) return "video";
  if (content.imageUrl) return "image";
  return undefined;
}

export function buildPushMessages(tokens: string[], content: PushContent): PushMessage[] {
  const mediaType = pushMediaType(content);

  return tokens.map((to) => ({
    to,
    sound: "default" as const,
    title: content.title,
    body: content.message,
    data: {
      type: content.type,
      notificationId: content.notificationId,
      screen: "Notification",
      ...(content.route ? { route: content.route } : {}),
      ...(content.imageUrl ? { imageUrl: content.imageUrl } : {}),
      ...(content.videoUrl ? { videoUrl: content.videoUrl } : {}),
      ...(mediaType ? { mediaType } : {}),
    },
    ...(content.imageUrl ? { richContent: { image: content.imageUrl } } : {}),
  }));
}
