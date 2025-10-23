import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'shippingSchedule',
  title: 'Shipping Schedules',
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
      description: 'Mark the route currently in use on the map.',
    }),

    defineField({
      name: 'departureTime',
      title: 'Departure Time',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),


    defineField({
      name: 'capacity',
      title: 'Capacity (kg)',
      type: 'number',
      validation: (Rule) => Rule.min(1).required(),
    }),

    defineField({
      name: 'availableCapacity',
      title: 'Available Capacity (kg)',
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
          {title: 'Cargo Van', value: 'cargo_van'},
          {title: 'Truck', value: 'truck'},
          {title: 'Container Ship', value: 'container_ship'},
          {title: 'Air Freight', value: 'air_freight'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 2,
    }),

    defineField({
      name: 'assignedDriver',
      title: 'Assigned Driver',
      type: 'reference',
      to: [{ type: 'users' }],
      options: {
        filter: 'isDriver == true',
      },
    }),
  ],

  preview: {
    select: {
      route: 'route',
      status: 'status',
      time: 'departureTime',
    },
    prepare(selection) {
      const {route, status, time} = selection
      const routeTitle = route?.replace('_', ' → ')?.replace('tunis', 'Tunis') || 'Unknown Route'

      return {
        title: `${routeTitle} - ${status}`,
        subtitle: `${new Date(time).toLocaleDateString()}`,
      }
    },
  },
})
