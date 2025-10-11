import { AutoText } from "../components/ui/AutoText";

const parseAPIDate = (dateString: string): Date => {
  try {
    // Handle format like "9-23-2025 2:45AM"
    const [datePart, timePart] = dateString.split(" ");
    const [month, day, year] = datePart.split("-").map(Number);

    let [time, period] = [timePart.slice(0, -2), timePart.slice(-2)];
    let [hours, minutes] = time.split(":").map(Number);

    // Convert 12-hour to 24-hour format
    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours !== 12) hours += 12;

    return new Date(year, month - 1, day, hours, minutes);
  } catch {
    return new Date(dateString); // Fallback to standard parsing
  }
};

export const TranslatableDateText = ({
  dateString,
  className,
}: {
  dateString?: string;
  className?: string;
}) => {
  if (!dateString) {
    return <AutoText className={className}>Just nu</AutoText>;
  }

  const date = parseAPIDate(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // Invalid date handling
  if (isNaN(date.getTime())) {
    return <AutoText className={className}>Okänd tid</AutoText>;
  }

  // Less than 1 minute ago
  if (diffInMinutes < 1) {
    return <AutoText className={className}>Just nu</AutoText>;
  }

  // Less than 1 hour ago
  if (diffInMinutes < 60) {
    return <AutoText className={className}>{diffInMinutes} min sedan</AutoText>;
  }

  // Less than 24 hours ago
  if (diffInHours < 24) {
    return <AutoText className={className}>{diffInHours}h sedan</AutoText>;
  }

  // Less than 7 days ago
  if (diffInDays < 7) {
    if (diffInDays === 1) {
      return <AutoText className={className}>Igår</AutoText>;
    }
    return <AutoText className={className}>{diffInDays} dagar sedan</AutoText>;
  }

  // More than 7 days ago - show actual date (no translation needed)
  const isCurrentYear = date.getFullYear() === now.getFullYear();

  if (isCurrentYear) {
    // Same year: show "12 Jan, 14:30"
    const formatted = `${date.getDate()} ${date.toLocaleString("sv-SE", {
      month: "short",
    })}, ${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    return <AutoText className={className}>{formatted}</AutoText>;
  } else {
    // Different year: show "12 Jan 2023"
    const formatted = `${date.getDate()} ${date.toLocaleString("sv-SE", {
      month: "short",
    })} ${date.getFullYear()}`;
    return <AutoText className={className}>{formatted}</AutoText>;
  }
};