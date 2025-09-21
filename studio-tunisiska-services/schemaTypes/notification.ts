import { defineType, defineField } from "sanity";

export default defineType({
  name: "notification",
  title: "Notification",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "message", title: "Message", type: "text" }),
    defineField({ name: "sendToAll", title: "Send to All Users", type: "boolean" }),
    defineField({ name: "sent", title: "Sent", type: "boolean", readOnly: true }),
    defineField({ name: "sentAt", title: "Sent At", type: "datetime", readOnly: true }),
    defineField({ name: "sentCount", title: "Sent Count", type: "number", readOnly: true }),
  ],
});