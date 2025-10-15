import { defineType, defineField } from "sanity";

export default defineType({
  name: "friendRequest",
  title: "Friend Requests",
  type: "document",
  fields: [
    defineField({
      name: "fromUserId",
      title: "From User ID",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "fromUserName",
      title: "From User Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "fromUserImageUrl",
      title: "From User Image URL",
      type: "url",
    }),
    defineField({
      name: "fromUserPoints",
      title: "From User Points",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "toUserId",
      title: "To User ID",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Accepted", value: "accepted" },
          { title: "Rejected", value: "rejected" },
        ],
      },
      initialValue: "pending",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "updatedAt",
      title: "Updated At",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "pointsReward",
      title: "Points Reward",
      type: "number",
      initialValue: 50,
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "pointsClaimed",
      title: "Points Claimed",
      type: "boolean",
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: "fromUserName",
      subtitle: "toUserId",
      status: "status",
    },
    prepare(selection) {
      const { title, subtitle, status } = selection;
      return {
        title: `${title} → ${subtitle.slice(-8)}`,
        subtitle: `Status: ${status}`,
      };
    },
  },
});