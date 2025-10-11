import { defineType, defineField } from "sanity";

export const liveStatus = defineType({
  name: "liveStatus",
  title: "Live Status",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "An optional title for this live status group, e.g. 'Direkt för idag'",
    }),
    defineField({
      name: "statuses",
      title: "Statuses",
      type: "array",
      of: [{ type: "string" }],
      description: "List of live status messages that will rotate in the app",
    }),
    defineField({
      name: "isActive",
      title: "Is Active?",
      type: "boolean",
      initialValue: true,
      description: "Toggle whether this status group is active",
    }),
  ],
  preview: {
    select: {
      title: "title",
      count: "statuses.length",
    },
    prepare(selection) {
      const { title, count } = selection;
      return {
        title: title || "Live Status",
        subtitle: `${count || 0} statuses`,
      };
    },
  },
});