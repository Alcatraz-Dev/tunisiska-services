import {defineType} from 'sanity'

export default defineType({
  name: 'support',
  title: 'Help & Support',
  type: 'document',
  fields: [
    {
      name: 'email',
      title: 'Support email',
      type: 'string',
      description: 'Opened in the mail app when a user taps "Email support".',
    },
    {
      name: 'phone',
      title: 'Support phone',
      type: 'string',
      description: 'Opened in the phone app when a user taps "Call support".',
    },
    {
      name: 'whatsapp',
      title: 'WhatsApp number',
      type: 'string',
      description: 'Opened in WhatsApp when a user taps "Chat with us". Include the country code.',
    },
    {
      name: 'faqs',
      title: 'Frequently asked questions',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'question',
              title: 'Question',
              type: 'string',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'answer',
              title: 'Answer',
              type: 'text',
              validation: (Rule) => Rule.required(),
            },
          ],
          preview: {
            select: {
              title: 'question',
              subtitle: 'answer',
            },
          },
        },
      ],
    },
  ],
  preview: {
    select: {
      email: 'email',
      phone: 'phone',
    },
    prepare(selection) {
      const {email, phone} = selection
      return {
        title: 'Help & Support settings',
        subtitle: [email, phone].filter(Boolean).join(' · ') || 'No contact details yet',
      }
    },
  },
})
