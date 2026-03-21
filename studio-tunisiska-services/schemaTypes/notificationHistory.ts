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
