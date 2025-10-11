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
  ],
  preview: {
    select: {
      title: 'title',
      media: 'media.image',
    },
    prepare(selection) {
      const {title, media} = selection
      return {
        title,
        media,
      }
    },
  },
})