import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'users',
  title: 'Users',
  type: 'document',
  fields: [
    defineField({
      name: 'clerkId',
      title: 'Clerk ID',
      type: 'string',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
    }),
    defineField({
      name: 'points',
      title: 'Points',
      type: 'number',
      initialValue: 0,
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'transactions',
      title: 'Transactions',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'id',
              title: 'Transaction ID',
              type: 'string',
            }),
            defineField({
              name: 'type',
              title: 'Type',
              type: 'string',
              options: {
                list: [
                  {title: 'Earned', value: 'earned'},
                  {title: 'Spent', value: 'spent'},
                  {title: 'Withdrawn', value: 'withdrawn'},
                ],
              },
            }),
            defineField({
              name: 'points',
              title: 'Points',
              type: 'number',
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'string',
            }),
            defineField({
              name: 'date',
              title: 'Date',
              type: 'datetime',
            }),
          ],
        },
      ],
    }),
    // Add driver field
    defineField({
      name: 'isDriver',
      title: 'Is Driver',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'driverLocation',
      title: 'Driver Location',
      type: 'geopoint',
      hidden: ({parent}: any) => !parent?.isDriver, // only relevant for drivers
    }),
    // Add admin field
    defineField({
      name: 'isAdmin',
      title: 'Is Admin',
      type: 'boolean',
      initialValue: false,
    }),
    // Written by the app when a phone registers for push.
    defineField({
      name: 'expoPushToken',
      title: 'Expo Push Token',
      type: 'string',
      readOnly: true,
      description: 'Set automatically by the app on a physical device.',
    }),
    defineField({
      name: 'pushPlatform',
      title: 'Push Platform',
      type: 'string',
      readOnly: true,
      options: { list: ['ios', 'android'] },
    }),
    defineField({
      name: 'pushUpdatedAt',
      title: 'Push Token Updated',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'email',
      subtitle: 'clerkId',
    },
  },
})
