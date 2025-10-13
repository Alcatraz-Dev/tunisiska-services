import { defineType, defineField } from "sanity";

export default defineType({
  name: "shippingSchedule",
  title: "Shipping Schedules",
  type: "document",
  fields: [
    defineField({
      name: "date",
      title: "Date",
      type: "date",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "route",
      title: "Route",
      type: "string",
      options: {
        list: [
          { title: "Stockholm → Tunis", value: "stockholm_tunis" },
          { title: "Göteborg → Tunis", value: "goteborg_tunis" },
          { title: "Malmö → Tunis", value: "malmo_tunis" },
          { title: "Tunis → Stockholm", value: "tunis_stockholm" },
          { title: "Tunis → Göteborg", value: "tunis_goteborg" },
          { title: "Tunis → Malmö", value: "tunis_malmo" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "departureTime",
      title: "Departure Time",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "arrivalTime",
      title: "Arrival Time (Estimated)",
      type: "string",
    }),
    defineField({
      name: "capacity",
      title: "Capacity (kg)",
      type: "number",
      validation: (Rule) => Rule.min(1).required(),
    }),
    defineField({
      name: "availableCapacity",
      title: "Available Capacity (kg)",
      type: "number",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Available", value: "available" },
          { title: "Full", value: "full" },
          { title: "Cancelled", value: "cancelled" },
          { title: "Departed", value: "departed" },
        ],
      },
      initialValue: "available",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "vehicle",
      title: "Vehicle",
      type: "string",
      options: {
        list: [
          { title: "Cargo Van", value: "cargo_van" },
          { title: "Truck", value: "truck" },
          { title: "Container Ship", value: "container_ship" },
          { title: "Air Freight", value: "air_freight" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "notes",
      title: "Notes",
      type: "text",
      rows: 2,
    }),
  ],
  preview: {
    select: {
      title: "route",
      subtitle: "date",
      status: "status",
      time: "departureTime",
    },
    prepare(selection) {
      const { title, subtitle, status, time } = selection;
      return {
        title: `${title} - ${status}`,
        subtitle: `${subtitle} ${time}`,
      };
    },
  },
});