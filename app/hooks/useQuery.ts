import { client } from "@/sanityClient";

export const useQuery = async (query: string) => {
  const data = await client.fetch(query);
  return data;
};

export const createNewUser = async ({
  name,
  email,
  clerkId,
  pushToken,
}: {
  name: string;
  email: string;
  clerkId: string;
  pushToken: any;
}) => {
  const user = await client.create({
    _type: "users",
    name,
    email,
    clerkId,
    pushToken,
  });
  return user;
};
export const liveStatusQuery = `*[_type == "liveStatus" && isActive == true][0]{
  ...,
  title,
  statuses
}`;

export const announcementQuery = `*[_type == "announcement" && !(_id in path("drafts.**"))] | order(date desc)[0...10]{
  ...,
  title,
  message,
  description,
  date,
  icon,
  color,
  media {
    type,
    "imageUrl": image.asset->url,
    "videoUrl": video.asset->url
  },
  link,
  "slug": slug.current
}`;

export const singleAnnouncementQuery = `*[_type == "announcement" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
  ...,
  title,
  message,
  description,
  date,
  icon,
  color,
  media {
    type,
    "imageUrl": image.asset->url,
    "videoUrl": video.asset->url
  },
  link,
  "slug": slug.current
}`;

export const footerQuery = `*[_type == "footer" && !(_id in path("drafts.**"))][0]{
  ...,
  links,
  socialMedia,
  copyright
}`;

export const termsQuery = `*[_type == "terms" && !(_id in path("drafts.**"))][0]{
  ...,
  title,
  content,
  lastUpdated
}`;

export const policyQuery = `*[_type == "policy" && !(_id in path("drafts.**"))][0]{
  ...,
  title,
  content,
  lastUpdated
}`;
