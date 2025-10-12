import { defineType, defineField } from "sanity";

export default defineType({
  name: "moveOrder",
  title: "Flytt utan städning Orders",
  type: "document",
  fields: [
    defineField({
      name: "userId",
      title: "User ID",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "serviceType",
      title: "Service Type",
      type: "string",
      initialValue: "move",
      readOnly: true,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "status",
      title: "Order Status",
      type: "string",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Confirmed", value: "confirmed" },
          { title: "In Progress", value: "in_progress" },
          { title: "Completed", value: "completed" },
          { title: "Cancelled", value: "cancelled" },
        ],
        layout: "radio",
      },
      initialValue: "pending",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "customerInfo",
      title: "Customer Information",
      type: "object",
      fields: [
        defineField({
          name: "name",
          title: "Name",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "phone",
          title: "Phone",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "email",
          title: "Email",
          type: "string",
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "pickupAddress",
      title: "Pickup Address",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "deliveryAddress",
      title: "Delivery Address",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "scheduledDateTime",
      title: "Scheduled Date & Time",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "numberOfItems",
      title: "Number of Items",
      type: "number",
      validation: (Rule) => Rule.min(1).required(),
    }),
    defineField({
      name: "numberOfPersons",
      title: "Number of Persons",
      type: "number",
      validation: (Rule) => Rule.min(1).required(),
    }),
    defineField({
      name: "hasElevator",
      title: "Has Elevator",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "itemCategories",
      title: "Item Categories",
      type: "array",
      of: [{ type: "string" }],
      validation: (Rule) => Rule.required().min(1),
      options: {
        list: [
          { title: "Möbler", value: "furniture" },
          { title: "Elektronik", value: "electronics" },
          { title: "Lådor", value: "boxes" },
          { title: "Kläder", value: "clothing" },
          { title: "Skör", value: "fragile" },
          { title: "Tunga föremål", value: "heavy_items" },
          { title: "Vitvaror", value: "appliances" },
        ],
      },
    }),
    defineField({
      name: "estimatedHours",
      title: "Estimated Hours",
      type: "number",
      description: "Estimated time for the move",
    }),
    defineField({
      name: "totalPrice",
      title: "Total Price (SEK)",
      type: "number",
      validation: (Rule) => Rule.min(0).required(),
    }),
    defineField({
      name: "pointsUsed",
      title: "Points Used",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "paymentMethod",
      title: "Payment Method",
      type: "string",
      options: {
        list: [
          { title: "Stripe", value: "stripe" },
          { title: "Points", value: "points" },
          { title: "Combined", value: "combined" },
          { title: "Cash", value: "cash" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "notes",
      title: "Special Notes/Instructions",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "specialRequirements",
      title: "Special Requirements",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    }),
    defineField({
      name: "updatedAt",
      title: "Updated At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      title: "customerInfo.name",
      subtitle: "pickupAddress",
      status: "status",
      date: "scheduledDateTime",
    },
    prepare(selection) {
      const { title, subtitle, status, date } = selection;
      return {
        title: `${title} - ${status}`,
        subtitle: `${subtitle} → ${date ? new Date(date).toLocaleString() : 'No date'}`,
      };
    },
  },
});