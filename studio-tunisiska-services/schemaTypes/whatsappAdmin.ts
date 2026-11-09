import {defineType} from 'sanity'

/**
 * A WhatsApp number allowed to publish News through the gateway.
 *
 * Created by the admin panel: it stores a short-lived verification code first,
 * then `verifiedAt` once that code is sent from the number to the business
 * account. Documents without `verifiedAt` cannot publish.
 */
export default defineType({
  name: 'whatsappAdmin',
  title: 'WhatsApp admins',
  type: 'document',
  fields: [
    {
      name: 'phone',
      title: 'Phone number',
      type: 'string',
      description: 'Digits only, with the country code.',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'verifiedAt',
      title: 'Verified at',
      type: 'datetime',
      readOnly: true,
      description: 'Set when the number sent its verification code. Empty means not verified.',
    },
    {
      name: 'code',
      title: 'Verification code',
      type: 'string',
      readOnly: true,
      hidden: true,
    },
    {
      name: 'codeExpiresAt',
      title: 'Code expires at',
      type: 'datetime',
      readOnly: true,
      hidden: true,
    },
    {
      name: 'requestedAt',
      title: 'Requested at',
      type: 'datetime',
      readOnly: true,
    },
  ],
  preview: {
    select: {phone: 'phone', verifiedAt: 'verifiedAt'},
    prepare({phone, verifiedAt}) {
      return {
        title: phone || 'Unnamed number',
        subtitle: verifiedAt ? 'Verified' : 'Not verified',
      }
    },
  },
})
