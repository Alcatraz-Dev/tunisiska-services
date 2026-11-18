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

export const liveStatusQuery = `*[_type == "liveStatus" && !(_id in path("drafts.**"))][0]{
  _id,
  type,
  departureTime,
  estimatedArrival,
  origin,
  destination,
  currentLocation,
  speed,
  progress,
  status,
  stops,
  trackingNumber,
  driverName,
  vehiclePlate,
  updatedAt
}`;

export const announcementsQuery = `*[_type == "announcement" && !(_id in path("drafts.**")) && isActive == true] | order(publishedAt desc) {
  _id,
  title,
  message,
  type,
  link,
  linkText,
  publishedAt
}`;

export const taxiQuery = `*[_type == "taxiOrder" && !(_id in path("drafts.**"))]{
  ...
}`;

export const shippingQuery = `*[_type == "shippingOrder" && !(_id in path("drafts.**"))]{
  ...
}`;

export const containerShippingQuery = `*[_type == "containerShippingOrder" && !(_id in path("drafts.**"))]{
  ...
}`;

export const moveCleaningQuery = `*[_type == "moveCleaningOrder" && !(_id in path("drafts.**"))]{
  ...
}`;

export const allBookingsQuery = `{
  "taxiOrders": *[_type == "taxiOrder" && !(_id in path("drafts.**"))]{
    ...,
    "serviceType": "taxi"
  },
  "shippingOrders": *[_type == "shippingOrder" && !(_id in path("drafts.**"))]{
    ...,
    "serviceType": "shipping"
  },
  "containerShippingOrders": *[_type == "containerShippingOrder" && !(_id in path("drafts.**"))]{
    ...,
    "serviceType": "containerShipping"
  },
  "moveCleaningOrders": *[_type == "moveCleaningOrder" && !(_id in path("drafts.**"))]{
    ...,
    "serviceType": "moveCleaning"
  }
}`;

export const footerQuery = `*[_type == "footer" && !(_id in path("drafts.**"))][0]{
  ...,
  "links": links[]{
    ...,
    name,
    url
  },
  "socialMedia": socialMedia[]{
    ...,
    platform,
    url
  },
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

export const supportQuery = `*[_type in ["helpSupport", "support"] && !(_id in path("drafts.**"))][0]{
  ...,
  title,
  heroTitle,
  heroSubtitle,
  email,
  phone,
  whatsapp,
  supportHours,
  responseNotice,
  faqs,
  updatedAt
}`;

export const helpSupportQuery = supportQuery;
