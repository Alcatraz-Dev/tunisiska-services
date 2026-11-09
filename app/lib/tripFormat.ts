/**
 * Trip presentation helpers.
 *
 * All formatting is timezone-aware: a departure is always shown in the local
 * time of its **origin**, which is the time the company schedules and
 * communicates departures in.
 */
import {
  zonedDateLabel,
  zonedFullDateLabel,
  zonedTime,
  zonedWeekdayLabel,
  currentDateLocale,
} from "@/app/lib/time";
import { TRIP_STATUS, VEHICLE_LABELS } from "@/app/lib/routes";
import type { Trip } from "@/app/lib/tripTypes";

function zoneOf(trip: Trip) {
  return trip.route.timezone as "Europe/Stockholm" | "Africa/Tunis";
}

/** e.g. `2 Nov` */
export function formatDepartureDate(trip: Trip): string {
  return zonedDateLabel(trip.departureDate, zoneOf(trip));
}

/** e.g. `12:00` */
export function formatDepartureTime(trip: Trip): string {
  return zonedTime(trip.departureDate, zoneOf(trip));
}

/** e.g. `2 Nov · 12:00` — the format used on cards in the reference. */
export function formatDepartureLabel(trip: Trip): string {
  return `${formatDepartureDate(trip)} · ${formatDepartureTime(trip)}`;
}

/** e.g. `Sunday, 2 November 2026` */
export function formatFullDate(trip: Trip): string {
  const weekday = zonedWeekdayLabel(trip.departureDate, zoneOf(trip));
  const date = zonedFullDateLabel(trip.departureDate, zoneOf(trip));
  return `${weekday}, ${date}`;
}

/** Human label for the vehicle. */
export function formatVehicle(vehicle?: string): string {
  if (!vehicle) return "Transport";
  return VEHICLE_LABELS[vehicle] ?? "Transport";
}

/** Status label and semantic tone. */
export function formatStatus(status?: string): {
  label: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
} {
  if (!status) return { label: "Scheduled", tone: "neutral" };
  return TRIP_STATUS[status] ?? { label: status, tone: "neutral" };
}

/** `Stockholm → Tunis` */
export function formatRoute(trip: Trip): string {
  return `${trip.origin} → ${trip.destination}`;
}

/** `Sweden → Tunisia` */
export function formatDirection(trip: Trip): string {
  return trip.route.directionLabel;
}

/**
 * True when the departure is still ahead of `now`.
 */
export function isUpcoming(trip: Trip, now: Date = new Date()): boolean {
  return trip.departureDate.getTime() >= now.getTime();
}

/** Remaining time until departure, e.g. `2 days` / `5 hours` / `Departed`. */
export function timeUntilDeparture(
  trip: Trip,
  now: Date = new Date(),
  languageOverride?: string,
): string {
  const diff = trip.departureDate.getTime() - now.getTime();
  if (diff <= 0) {
    const lang = languageOverride ?? currentDateLocale();
    const short = lang.toLowerCase().split(/[-_]/)[0];
    return short === "ar"
      ? "اكتملت المغادرة"
      : short === "en"
        ? "Departed"
        : "Avgången har skett";
  }

  const locale = languageOverride ?? currentDateLocale();
  const language = locale.toLowerCase().split(/[-_]/)[0];
  const minutes = Math.floor(diff / 60000);

  const relative = (amount: number, unit: "minute" | "hour" | "day") => {
    const count = Math.max(1, amount);
    if (language === "sv") {
      const units = {
        minute: count === 1 ? "minut" : "minuter",
        hour: count === 1 ? "timme" : "timmar",
        day: count === 1 ? "dag" : "dagar",
      };
      return `Om ${count} ${units[unit]}`;
    }
    if (language === "ar") {
      const units = {
        minute: count === 1 ? "دقيقة" : "دقائق",
        hour: count === 1 ? "ساعة" : "ساعات",
        day: count === 1 ? "يوم" : "أيام",
      };
      return `خلال ${count} ${units[unit]}`;
    }
    const units = {
      minute: count === 1 ? "minute" : "minutes",
      hour: count === 1 ? "hour" : "hours",
      day: count === 1 ? "day" : "days",
    };
    return `In ${count} ${units[unit]}`;
  };

  if (minutes < 60) return relative(minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relative(hours, "hour");

  const days = Math.floor(hours / 24);
  return relative(days, "day");
}
