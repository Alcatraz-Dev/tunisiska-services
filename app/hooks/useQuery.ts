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
