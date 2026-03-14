import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'containerShippingSchedule',
  title: 'Container Shipping Schedules',
  type: 'document',
  fields: [
    defineField({
      name: 'route',
      title: 'Route',
      type: 'string',
      options: {
        list: [
          {title: 'Stockholm → Tunis', value: 'stockholm_tunis'},
          {title: 'Tunis → Stockholm', value: 'tunis_stockholm'},
          {title: 'Tunis → Sousse', value: 'tunis_sousse'},
          {title: 'Tunis → Sfax', value: 'tunis_sfax'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isActive',
      title: 'Active Route',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'departureTime',
      title: 'Departure Time',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'capacity', 
      title: 'Capacity (Number of containers)',
      type: 'number',
      validation: (Rule) => Rule.min(1).required(),
    }),
    defineField({
      name: 'availableCapacity',
      title: 'Available Capacity',
      type: 'number',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          {title: 'Available', value: 'available'},
          {title: 'Full', value: 'full'},
          {title: 'Cancelled', value: 'cancelled'},
          {title: 'Departed', value: 'departed'},
        ],
      },
      initialValue: 'available',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'vehicle',
      title: 'Vehicle',
      type: 'string',
      options: {
        list: [
          {title: 'Container Ship', value: 'container_ship'},
        ],
      },
      initialValue: 'container_ship',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 2,
    }),
  ],

  preview: {
    select: {
      route: 'route',
      status: 'status',
      time: 'departureTime',
    },
    prepare(selection: any) {
      const {route, status, time} = selection
      const routeTitle = route?.replace('_', ' → ')?.replace('tunis', 'Tunis') || 'Unknown Route'

      return {
        title: `${routeTitle} - ${status}`,
        subtitle: `${new Date(time).toLocaleDateString()}`,
      }
    },
  },
})
