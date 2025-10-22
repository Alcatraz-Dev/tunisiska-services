import { defineType, defineField } from "sanity";

export default defineType({
  name: "shippingOrder",
  title: "Shipping Orders",
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
      initialValue: "shipping",
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
      title: "Package Details",
      type: "object",
      fields: [
        defineField({
          name: "weight",
          title: "Weight (kg)",
          type: "number",
          validation: (Rule) => Rule.min(0.1).required(),
        }),
        defineField({
          name: "dimensions",
          title: "Dimensions (cm)",
          type: "object",
          fields: [
            defineField({
              name: "length",
              title: "Length",
              type: "number",
              validation: (Rule) => Rule.min(1).required(),
            }),
            defineField({
              name: "width",
              title: "Width",
              type: "number",
              validation: (Rule) => Rule.min(1).required(),
            }),
            defineField({
              name: "height",
              title: "Height",
              type: "number",
              validation: (Rule) => Rule.min(1).required(),
            }),
          ],
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
        defineField({
          name: "isFragile",
          title: "Fragile",
          type: "boolean",
          initialValue: false,
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "shippingSpeed",
      title: "Shipping Speed",
      type: "string",
      options: {
        list: [
          { title: "Standard (3-5 days)", value: "standard" },
          { title: "Express (1-2 days)", value: "express" },
          { title: "Overnight (Next day)", value: "overnight" },
        ],
        layout: "radio",
      },
      initialValue: "standard",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "requiresSignature",
      title: "Requires Signature",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "insuranceValue",
      title: "Insurance Value (SEK)",
      type: "number",
      description: "Additional insurance coverage",
    }),
    defineField({
      name: "trackingNumber",
      title: "Tracking Number",
      type: "string",
      readOnly: true,
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