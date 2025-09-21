import { defineType, defineField } from "sanity";

export default defineType({
  name: "users",
  title: "Users",
  type: "document",
  fields: [
    defineField({
      name: "clerkId",
      title: "Clerk ID",
      type: "string",
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
    }),
   
    defineField({
      name: "pushToken",
      title: "Expo Push Token",
      type: "string",
    }),
   
  ],
  preview: {
    select: {
      title: "email",
      subtitle: "clerkId",
    },
  },
});