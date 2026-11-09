import {defineType} from 'sanity'

export default defineType({
  name: 'announcement',
  title: 'Announcements',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
    },

    {
      name: 'message',
      title: 'Message',
      type: 'string',
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
    },
    {
      name: 'date',
      title: 'Date',
      type: 'datetime',
    },
    {
      name: 'icon',
      title: 'Icon',
      type: 'string',
    },
    {
      name: 'color',
      type: 'color', // comes from @sanity/color-input
      title: 'Color',
      options: {
        colorList: [
          '#FF6900',
          {hex: '#FCB900'},
          {r: 123, g: 220, b: 181},
          {r: 0, g: 208, b: 132, a: 0.5},
          {h: 203, s: 95, l: 77, a: 1},
          {h: 202, s: 95, l: 46, a: 0.5},
          {h: 345, s: 43, v: 97},
          {h: 344, s: 91, v: 92, a: 0.5},
        ],
      },
    },
    {
      name: "media",
      title: "Media (Image or Video)",
      type: "object",
      fields: [
        {
          name: "type",
          title: "Type",
          type: "string",
          options: {
            list: [
              { title: "Image", value: "image" },
              { title: "Video", value: "video" },
            ],
            layout: "radio",
          },
          validation: (Rule) => Rule.required(),
        },
        {
          name: "image",
          title: "Image",
          type: "image",
          options: { hotspot: true },
          hidden: ({ parent }) => parent?.type !== "image",
        },
        {
          name: "video",
          title: "Video",
          type: "file",
          options: { accept: "video/*" },
          hidden: ({ parent }) => parent?.type !== "video",
        },
      ],
    },
    {
      name: 'link',
      title: 'Link for more information',
      type: 'url',
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      description:
        'Drafts are never shown in the app. Only published announcements appear in News.',
      options: {
        list: [
          {title: 'Published', value: 'published'},
          {title: 'Draft', value: 'draft'},
        ],
        layout: 'radio',
      },
      initialValue: 'published',
    },
    {
      name: 'isImportant',
      title: 'Important',
      type: 'boolean',
      description:
        'Marks the announcement as important. The app shows an "Important" label on it.',
      initialValue: false,
    },
    {
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      description:
        'When the announcement was published. Used for the relative timestamp in the app.',
    },
    {
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 2,
      description: 'Optional short summary shown on the news card.',
    },
    {
      name: 'source',
      title: 'Source',
      type: 'string',
      readOnly: true,
      initialValue: 'manual',
      options: {
        list: [
          {title: 'Created here', value: 'manual'},
          {title: 'WhatsApp gateway', value: 'whatsapp'},
        ],
      },
      description:
        'Set automatically. Entries created by the WhatsApp gateway are published as soon as the photo or video arrives.',
    },
    {
      name: 'whatsappSender',
      title: 'WhatsApp sender',
      type: 'string',
      readOnly: true,
      description: 'Phone number that sent the media through the WhatsApp gateway.',
    },
  ],
  preview: {
    select: {
      title: 'title',
      media: 'media',
      status: 'status',
      isImportant: 'isImportant',
      source: 'source',
    },

    prepare(selection) {
      const {title, media, status, isImportant, source} = selection
      let previewMedia = null
      if (media?.type === 'image') {
        previewMedia = media.image
      } else if (media?.type === 'file') {
        previewMedia = media.video
      }
      const markers = [
        status === 'draft' ? 'DRAFT' : null,
        isImportant ? 'IMPORTANT' : null,
        source === 'whatsapp' ? 'WHATSAPP' : null,
      ].filter(Boolean)

      return {
        title: markers.length ? `${title} (${markers.join(', ')})` : title,
        media: previewMedia,
      }
    },
  },
})