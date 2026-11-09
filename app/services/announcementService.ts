/**
 * AnnouncementService — the read path for company announcements.
 *
 * Uses the existing `announcement` documents in Sanity. The `isImportant` and
 * `publishedAt` fields are read through `coalesce` so the app works with
 * documents created before those fields existed, and starts honouring them as
 * soon as administrators publish them.
 */
import { client } from "@/sanityClient";

export type AnnouncementMedia = {
  type?: "image" | "video";
  imageUrl?: string;
  videoUrl?: string;
};

export type Announcement = {
  id: string;
  slug: string;
  title: string;
  message: string;
  description?: string;
  date?: string;
  icon?: string;
  color?: string;
  media?: AnnouncementMedia;
  link?: string;
  /** Surfaced as the "Important" label in the reference. */
  isImportant: boolean;
  /** Publication date, when the CMS provides one. */
  publishedAt?: string;
  /** Whether the announcement is published. Drafts never reach the app. */
  published: boolean;
};

const PROJECTION = `{
  _id,
  "slug": slug.current,
  title,
  message,
  description,
  date,
  icon,
  "color": coalesce(color.hex, color),
  media {
    type,
    "imageUrl": image.asset->url,
    "videoUrl": video.asset->url
  },
  link,
  "isImportant": coalesce(isImportant, false),
  "publishedAt": coalesce(publishedAt, date),
  "status": coalesce(status, "published")
}`;

const LIST_QUERY = `
*[_type == "announcement" && !(_id in path("drafts.**"))] | order(date desc)[0...20] ${PROJECTION}
`;

const DETAIL_QUERY = `
*[_type == "announcement" && slug.current == $slug && !(_id in path("drafts.**"))][0] ${PROJECTION}
`;

function normalise(raw: any): Announcement {
  const status = raw?.status ?? "published";
  return {
    id: raw?._id ?? "",
    slug: raw?.slug ?? "",
    title: raw?.title ?? "",
    message: raw?.message ?? "",
    description: raw?.description,
    date: raw?.date,
    icon: raw?.icon,
    color: raw?.color,
    media: raw?.media,
    link: raw?.link,
    isImportant: raw?.isImportant === true,
    publishedAt: raw?.publishedAt ?? raw?.date,
    published: status !== "draft",
  };
}

/**
 * All published announcements, newest first.
 *
 * Drafts are excluded by the query and documents explicitly marked as drafts
 * are filtered out here as well.
 */
export async function getAnnouncements(): Promise<Announcement[]> {
  const raw = (await client.fetch(LIST_QUERY)) as any[];
  return (raw ?? [])
    .map(normalise)
    .filter((a: Announcement) => a.published);
}

/** A single announcement by slug. */
export async function getAnnouncement(slug: string): Promise<Announcement | null> {
  try {
    const raw = await client.fetch(DETAIL_QUERY, { slug });
    if (!raw) return null;
    return normalise(raw);
  } catch (error) {
    console.error("Failed to load announcement:", error);
    return null;
  }
}
