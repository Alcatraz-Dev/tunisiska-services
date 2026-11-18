import { defineType } from "sanity";

export default defineType({
  name: "helpSupport",
  title: "Help & Support",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      initialValue: "Help & Support",
    },
    {
      name: "heroTitle",
      title: "Hero Title",
      type: "string",
      description: "Headline displayed in the top support card (e.g. How can we help?)",
    },
    {
      name: "heroSubtitle",
      title: "Hero Subtitle",
      type: "string",
      description: "Sub-headline under the hero title",
    },
    {
      name: "email",
      title: "Support Email",
      type: "string",
      description: "Contact email address (e.g. support@tunisiska.se)",
      validation: (Rule) => Rule.email(),
    },
    {
      name: "phone",
      title: "Support Phone Number",
      type: "string",
      description: "Phone number with country code (e.g. +46 70 123 4567)",
    },
    {
      name: "whatsapp",
      title: "WhatsApp Number",
      type: "string",
      description: "WhatsApp contact number (e.g. +46 73 777 8737)",
    },
    {
      name: "supportHours",
      title: "Support Working Hours",
      type: "string",
      description: "Available hours (e.g. Måndag - Fredag: 08:00 - 18:00)",
    },
    {
      name: "responseNotice",
      title: "Response Notice / SLA",
      type: "string",
      description: "Expected response time note (e.g. Vi svarar inom 1-2 timmar under öppettider)",
    },
    {
      name: "faqs",
      title: "Frequently Asked Questions",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "question",
              title: "Question",
              type: "string",
              validation: (Rule) => Rule.required(),
            },
            {
              name: "answer",
              title: "Answer",
              type: "text",
              rows: 3,
              validation: (Rule) => Rule.required(),
            },
            {
              name: "category",
              title: "Category",
              type: "string",
              description: "Optional category (e.g. Bokning, Spårning, Betalning)",
            },
          ],
          preview: {
            select: {
              title: "question",
              subtitle: "category",
            },
          },
        },
      ],
    },
    {
      name: "updatedAt",
      title: "Last Updated At",
      type: "datetime",
    },
  ],
  preview: {
    select: {
      title: "title",
      email: "email",
      phone: "phone",
    },
    prepare({ title, email, phone }) {
      return {
        title: title || "Help & Support",
        subtitle: [email, phone].filter(Boolean).join(" · ") || "No contact info configured",
      };
    },
  },
});

