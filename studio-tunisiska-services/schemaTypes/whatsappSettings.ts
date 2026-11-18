import {defineType} from 'sanity'

/**
 * Gateway-wide publishing rule, edited from the app's admin panel.
 *
 * `allowAll` lets every WhatsApp number publish News; when it is off, only the
 * numbers in "WhatsApp admins" (and WHATSAPP_ADMIN_NUMBERS) may publish.
 */
export default defineType({
  name: 'whatsappSettings',
  title: 'WhatsApp gateway settings',
  type: 'document',
  fields: [
    {
      name: 'allowAll',
      title: 'Any number can publish',
      type: 'boolean',
      initialValue: false,
      description:
        'On: every WhatsApp number that sends a photo or video is published. Off: only allowed numbers publish.',
    },
    {
      name: 'updatedAt',
      title: 'Updated at',
      type: 'datetime',
      readOnly: true,
    },
  ],
  preview: {
    select: {allowAll: 'allowAll'},
    prepare({allowAll}) {
      return {
        title: 'WhatsApp gateway settings',
        subtitle: allowAll ? 'Any number can publish' : 'Only allowed numbers',
      }
    },
  },
})
