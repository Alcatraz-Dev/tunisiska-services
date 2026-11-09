import {defineField} from 'sanity'

/**
 * Shared fields for the two schedule document types.
 *
 * These are the fields the redesigned app reads: a transport image, a summary,
 * and the **per-trip** collection and delivery configuration.
 *
 * Every field added here is optional, so documents created before these fields
 * existed keep working unchanged — no migration is required and no existing
 * data is invalidated.
 */

/** A single collection or delivery address. */
const pointField = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'object',
    fields: [
      defineField({
        name: 'name',
        title: 'Name',
        type: 'string',
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'address',
        title: 'Address',
        type: 'string',
      }),
      defineField({
        name: 'notes',
        title: 'Notes',
        type: 'string',
      }),
    ],
    preview: {
      select: {title: 'name', subtitle: 'address'},
    },
  })

export const tunisiaLocationsField = defineField({
  name: 'tunisiaLocations',
  title: 'Tunisia collection & delivery',
  description:
    'Availability is configured **per departure**. Only the governorates listed here are offered to customers for this trip.',
  type: 'array',
  of: [
    {
      type: 'object',
      name: 'tunisiaLocation',
      title: 'Governorate',
      fields: [
        defineField({
          name: 'governorate',
          title: 'Governorate',
          type: 'string',
          options: {
            list: [
              {title: 'Ariana', value: 'Ariana'},
              {title: 'Béja', value: 'Béja'},
              {title: 'Ben Arous', value: 'Ben Arous'},
              {title: 'Bizerte', value: 'Bizerte'},
              {title: 'Gabès', value: 'Gabès'},
              {title: 'Gafsa', value: 'Gafsa'},
              {title: 'Jendouba', value: 'Jendouba'},
              {title: 'Kairouan', value: 'Kairouan'},
              {title: 'Kasserine', value: 'Kasserine'},
              {title: 'Kebili', value: 'Kebili'},
              {title: 'Kef', value: 'Kef'},
              {title: 'Mahdia', value: 'Mahdia'},
              {title: 'Manouba', value: 'Manouba'},
              {title: 'Medenine', value: 'Medenine'},
              {title: 'Monastir', value: 'Monastir'},
              {title: 'Nabeul', value: 'Nabeul'},
              {title: 'Sfax', value: 'Sfax'},
              {title: 'Sidi Bouzid', value: 'Sidi Bouzid'},
              {title: 'Siliana', value: 'Siliana'},
              {title: 'Sousse', value: 'Sousse'},
              {title: 'Tataouine', value: 'Tataouine'},
              {title: 'Tozeur', value: 'Tozeur'},
              {title: 'Tunis', value: 'Tunis'},
              {title: 'Zaghouan', value: 'Zaghouan'},
            ],
          },
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'governorateKey',
          title: 'Stable key',
          description:
            'Machine key for this governorate. Leave empty to derive it from the name.',
          type: 'string',
        }),
        defineField({
          name: 'available',
          title: 'Served on this departure',
          type: 'boolean',
          initialValue: true,
          description:
            'Uncheck when the vehicle does not serve this governorate on this date.',
        }),
        defineField({
          name: 'notes',
          title: 'Notes for this governorate',
          type: 'string',
        }),
        pointField('collectionPoints', 'Collection points'),
        pointField('deliveryPoints', 'Delivery points'),
      ],
      preview: {
        select: {governorate: 'governorate', available: 'available'},
        prepare(selection) {
          const {governorate, available} = selection
          return {
            title: governorate || 'Governorate',
            subtitle: available === false ? 'Not served on this departure' : 'Available',
          }
        },
      },
    },
  ],
})

export const swedenCollectionField = defineField({
  name: 'swedenCollection',
  title: 'Collection in Sweden',
  type: 'object',
  fields: [
    defineField({
      name: 'postalInstructions',
      title: 'Postal service instructions',
      description:
        'How a customer should hand the parcel over through the Swedish postal service.',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'personalHandoverInstructions',
      title: 'Personal handover instructions',
      description:
        'How a customer should hand the parcel over in person, e.g. at the office.',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'notes',
      title: 'Additional notes',
      type: 'text',
      rows: 2,
    }),
  ],
})

export const imageField = defineField({
  name: 'image',
  title: 'Transport image',
  type: 'image',
  options: {
    hotspot: true,
  },
  description:
    'Photograph of this departure. The app falls back to branded artwork when no image is set.',
  fields: [
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
    }),
  ],
})

export const summaryField = defineField({
  name: 'summary',
  title: 'Summary',
  description: 'Short description shown on the trip details screen.',
  type: 'text',
  rows: 2,
})

export const originField = defineField({
  name: 'origin',
  title: 'Origin override',
  description:
    'Leave empty to use the route default. Set this only when the departure starts somewhere other than the route origin.',
  type: 'string',
})

export const destinationField = defineField({
  name: 'destination',
  title: 'Destination override',
  description:
    'Leave empty to use the route default. Set this only when the departure ends somewhere other than the route destination.',
  type: 'string',
})
