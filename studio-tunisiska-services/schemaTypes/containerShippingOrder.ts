import { defineType, defineField } from "sanity";

export default defineType({
  name: "containerShippingOrder",
  title: "Container Shipping Orders",
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
      initialValue: "container-shipping",
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
          name: "name", title: "Name", type: "string", validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "phone", title: "Phone", type: "string", validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: "email", title: "Email", type: "string",
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
      name: "route",
      title: "Route",
      type: "string",
      description: "Route identifier (e.g., stockholm_tunis)",
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
      name: "packageDetails",
      title: "Container Details",
      type: "object",
      fields: [
        defineField({
            name: "size",
            title: "Container Size",
            type: "string",
            options: {
                list: [
                    { title: "20ft", value: "20ft" },
                    { title: "40ft", value: "40ft" },
                ],
                layout: "radio",
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "description",
            title: "Description",
            type: "string",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: "value",
            title: "Value (SEK)",
            type: "number",
            validation: (Rule) => Rule.min(0).required(),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "totalPrice",
      title: "Total Price (SEK)",
      type: "number",
      validation: (Rule) => Rule.min(0).required(),
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
    prepare(selection: any) {
      const { title, subtitle, status, date } = selection;
      return {
        title: `${title} - ${status}`,
        subtitle: `${subtitle} → ${date ? new Date(date).toLocaleString() : 'No date'}`,
      };
    },
  },
});
