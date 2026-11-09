/**
 * Timezone-aware date helpers.
 *
 * Schedules are stored as absolute instants but *authored* in local time
 * (Stockholm or Tunis). Rendering them in UTC — the default — shifts the
 * departure by one or two hours and can move the departure to the wrong
 * calendar day. Every departure in the redesign is therefore rendered in the
 * **origin's** timezone.
 *
 * `Intl.DateTimeFormat` with `timeZone` is used when the runtime provides it.
 * Hermes builds without full ICU are handled by a deterministic fallback that
 * implements the two zones the company actually operates in.
 */
import { SWEDEN_TIMEZONE, TUNISIA_TIMEZONE } from "./routes";
import { useLanguageStore } from "@/app/hooks/useLanguage";

/** Locale for date labels in whichever language the app currently displays. */
export function currentDateLocale(languageOverride?: string): string {
  const language = languageOverride ?? useLanguageStore.getState().language;
  return language === "ar" ? "ar" : language === "en" ? "en-GB" : "sv-SE";
}

export type SupportedTimeZone =
  | typeof SWEDEN_TIMEZONE
  | typeof TUNISIA_TIMEZONE;

/** True when the runtime can format in an arbitrary IANA timezone. */
let intlTimeZoneSupport: boolean | null = null;

export function supportsIntlTimeZone(): boolean {
  if (intlTimeZoneSupport !== null) return intlTimeZoneSupport;
  try {
    const probe = new Intl.DateTimeFormat("en-US", {
      timeZone: SWEDEN_TIMEZONE,
      hour: "2-digit",
    }).format(new Date(0));
    intlTimeZoneSupport = typeof probe === "string" && probe.length > 0;
  } catch {
    intlTimeZoneSupport = false;
  }
  return intlTimeZoneSupport;
}

/**
 * Offset in minutes for the two supported zones at a given instant.
 *
 * - Europe/Stockholm: CET (UTC+1) / CEST (UTC+2), EU summer-time rule.
 * - Africa/Tunis: UTC+1 all year (Tunisia has not observed DST since 2011).
 */
function fallbackOffsetMinutes(date: Date, timeZone: SupportedTimeZone): number {
  if (timeZone === TUNISIA_TIMEZONE) return 60;

  // Europe/Stockholm — EU rule: 01:00 UTC on the last Sunday of March until
  // 01:00 UTC on the last Sunday of October.
  const year = date.getUTCFullYear();
  const marchLastSunday = lastSundayUtc(year, 2);
  const octoberLastSunday = lastSundayUtc(year, 9);

  const marchSwitch = Date.UTC(year, 2, marchLastSunday, 1, 0, 0);
  const octoberSwitch = Date.UTC(year, 9, octoberLastSunday, 1, 0, 0);
  const t = date.getTime();

  return t >= marchSwitch && t < octoberSwitch ? 120 : 60;
}

/** Day-of-month of the last Sunday in the given UTC month (0-indexed). */
function lastSundayUtc(year: number, monthIndex: number): number {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  for (let day = lastDay; day >= 1; day--) {
    const d = new Date(Date.UTC(year, monthIndex, day));
    if (d.getUTCDay() === 0) return day;
  }
  return lastDay;
}

/**
 * Wall-clock components of `date` as seen in `timeZone`.
 *
 * Returns the same shape as `Intl.DateTimeFormat(...).formatToParts()`.
 */
export function zonedParts(
  date: Date,
  timeZone: SupportedTimeZone,
): {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
} {
  if (supportsIntlTimeZone()) {
    try {
      const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "short",
        hour12: false,
      });
      const parts = dtf.formatToParts(date);
      const get = (type: string) =>
        parts.find((p) => p.type === type)?.value ?? "";
      const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      let hour = Number(get("hour"));
      // Intl can emit "24" for midnight in some engines.
      if (hour === 24) hour = 0;
      return {
        year: Number(get("year")),
        month: Number(get("month")),
        day: Number(get("day")),
        hour,
        minute: Number(get("minute")),
        weekday: weekdayMap[get("weekday")] ?? 0,
      };
    } catch {
      // Fall through to the manual implementation.
    }
  }

  const offset = fallbackOffsetMinutes(date, timeZone);
  const shifted = new Date(date.getTime() + offset * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

/** `YYYY-MM-DD` for the given instant **in the given zone**. */
export function zonedDateKey(date: Date, timeZone: SupportedTimeZone): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** `HH:MM` (24h) for the given instant **in the given zone**. */
export function zonedTime(date: Date, timeZone: SupportedTimeZone): string {
  if (supportsIntlTimeZone()) {
    try {
      return new Intl.DateTimeFormat(currentDateLocale(), {
        timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).format(date);
    } catch {
      // Use the deterministic 24-hour fallback below.
    }
  }
  const p = zonedParts(date, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Human date, e.g. `15 Nov`. */
export function zonedDateLabel(
  date: Date,
  timeZone: SupportedTimeZone,
  locale = currentDateLocale(),
): string {
  if (supportsIntlTimeZone()) {
    try {
      return new Intl.DateTimeFormat(locale, {
        timeZone,
        day: "numeric",
        month: "short",
      }).format(date);
    } catch {
      // Fall through.
    }
  }
  const p = zonedParts(date, timeZone);
  const month = MONTHS_SHORT[p.month - 1] ?? String(p.month);
  return `${p.day} ${month}`;
}

/** Human date including the year when it differs from the current year. */
export function zonedFullDateLabel(
  date: Date,
  timeZone: SupportedTimeZone,
  locale = currentDateLocale(),
): string {
  if (supportsIntlTimeZone()) {
    try {
      return new Intl.DateTimeFormat(locale, {
        timeZone,
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch {
      // Fall through.
    }
  }
  const p = zonedParts(date, timeZone);
  const month = MONTHS_LONG[p.month - 1] ?? String(p.month);
  return `${p.day} ${month} ${p.year}`;
}

/** Weekday label, e.g. `Saturday`. */
export function zonedWeekdayLabel(
  date: Date,
  timeZone: SupportedTimeZone,
  locale = currentDateLocale(),
): string {
  if (supportsIntlTimeZone()) {
    try {
      return new Intl.DateTimeFormat(locale, { timeZone, weekday: "long" }).format(
        date,
      );
    } catch {
      // Fall through.
    }
  }
  const p = zonedParts(date, timeZone);
  return WEEKDAYS_LONG[p.weekday] ?? "";
}

const MONTHS_SHORT = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

const MONTHS_LONG = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

const WEEKDAYS_LONG = [
  "söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag",
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** True when two instants fall on the same calendar day **in the given zone**. */
export function isSameZonedDay(
  a: Date,
  b: Date,
  timeZone: SupportedTimeZone,
): boolean {
  return zonedDateKey(a, timeZone) === zonedDateKey(b, timeZone);
}

/** Today's date key in the given zone. */
export function todayKey(
  timeZone: SupportedTimeZone,
  now: Date = new Date(),
): string {
  return zonedDateKey(now, timeZone);
}

/**
 * Relative time, e.g. `2h ago`.
 *
 * Used for announcement timestamps. Falls back to an absolute date when the
 * timestamp is missing or unparseable.
 */
export function formatRelativeTime(
  value?: string | Date | null,
  now: Date = new Date(),
  locale = currentDateLocale(),
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = now.getTime() - date.getTime();
  const language = locale.toLowerCase().split(/[-_]/)[0];
  const future = diffMs < 0;
  const relative = (amount: number, unit: "minute" | "hour" | "day" | "week" | "month" | "year") => {
    const count = Math.max(1, Math.abs(amount));
    const rounded = new Intl.NumberFormat(locale).format(count);

    if (language === "sv") {
      const units = {
        minute: count === 1 ? "minut" : "minuter",
        hour: count === 1 ? "timme" : "timmar",
        day: count === 1 ? "dag" : "dagar",
        week: count === 1 ? "vecka" : "veckor",
        month: count === 1 ? "månad" : "månader",
        year: count === 1 ? "år" : "år",
      };
      return future ? `om ${rounded} ${units[unit]}` : `för ${rounded} ${units[unit]} sedan`;
    }

    if (language === "ar") {
      const units = {
        minute: count === 1 ? "دقيقة" : "دقائق",
        hour: count === 1 ? "ساعة" : "ساعات",
        day: count === 1 ? "يوم" : "أيام",
        week: count === 1 ? "أسبوع" : "أسابيع",
        month: count === 1 ? "شهر" : "أشهر",
        year: count === 1 ? "سنة" : "سنوات",
      };
      return future ? `خلال ${rounded} ${units[unit]}` : `قبل ${rounded} ${units[unit]}`;
    }

    const units = {
      minute: count === 1 ? "minute" : "minutes",
      hour: count === 1 ? "hour" : "hours",
      day: count === 1 ? "day" : "days",
      week: count === 1 ? "week" : "weeks",
      month: count === 1 ? "month" : "months",
      year: count === 1 ? "year" : "years",
    };
    return future ? `in ${rounded} ${units[unit]}` : `${rounded} ${units[unit]} ago`;
  };

  if (Math.abs(diffMs) < 60_000) {
    return language === "ar" ? "الآن" : language === "sv" ? "nyss" : "just now";
  }
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return relative(minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative(hours, "hour");

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return relative(days, "day");

  const weeks = Math.round(days / 7);
  if (Math.abs(weeks) < 5) return relative(weeks, "week");

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return relative(months, "month");

  return relative(Math.round(days / 365), "year");
}
