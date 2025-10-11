import {defineType} from 'sanity'

export default defineType({
  name: 'policy',
  title: 'Privacy Policy',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [{type: 'block'}],
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'lastUpdated',
      title: 'Last Updated',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    },
  ],
  preview: {
    select: {
      title: 'title',
      lastUpdated: 'lastUpdated',
    },
    prepare(selection) {
      const {title, lastUpdated} = selection
      return {
        title,
        subtitle: lastUpdated ? new Date(lastUpdated).toLocaleDateString() : '',
      }
    },
  },
})