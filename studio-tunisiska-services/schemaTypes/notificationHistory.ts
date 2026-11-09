import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'notificationHistory',
  title: 'Notification History',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    defineField({
      name: 'message',
      title: 'Message',
      type: 'text',
    }),
    defineField({
      name: 'dateSent',
      title: 'Date Sent',
      type: 'datetime',
    }),
    defineField({
      name: 'notificationType',
      title: 'Type',
      type: 'string',
    }),
    defineField({
      name: 'type',
      title: 'Type (composer)',
      type: 'string',
      description: 'Notification category written by the admin composer.',
    }),
    defineField({
      name: 'sentAt',
      title: 'Sent At',
      type: 'datetime',
      description: 'Send time written by the admin composer.',
    }),
    defineField({
      name: 'imageUrl',
      title: 'Image URL',
      type: 'url',
    }),
    defineField({
      name: 'posterUrl',
      title: 'Video Poster URL',
      type: 'url',
      description: 'Still frame of the video, used as its thumbnail and push image.',
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
    }),
    defineField({
      name: 'delivered',
      title: 'Delivered',
      type: 'number',
    }),
    defineField({
      name: 'failed',
      title: 'Failed',
      type: 'number',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
    }),
    defineField({
      name: 'nativeNotifyId',
      title: 'NativeNotify ID',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'dateSent',
    },
  },
});
