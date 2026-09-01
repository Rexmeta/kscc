/**
 * Event dates are entered as wall-clock times for the Korean site.
 * Keep the business timezone explicit instead of relying on the browser or
 * server process timezone.
 */
export const EVENT_TIME_ZONE = "Asia/Seoul";
export const EVENT_TIME_ZONE_OFFSET = "+09:00";

export function parseEventDateTime(
  value: unknown,
): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // API values normally contain Z/an offset. Legacy datetime-local strings
  // do not, so interpret those as Korea Standard Time.
  const hasExplicitTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = /^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}$/i.test(trimmed)
    ? `${trimmed}:00`
    : trimmed;
  const parsed = new Date(
    hasExplicitTimeZone ? normalized : `${normalized}${EVENT_TIME_ZONE_OFFSET}`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function eventDateTimeLocalToDate(value: string): Date {
  const parsed = parseEventDateTime(value);
  if (!parsed) {
    throw new Error("Invalid event date");
  }
  return parsed;
}

export function formatEventDateTimeLocal(
  value: string | number | Date | null | undefined,
): string {
  const date = parseEventDateTime(value);
  if (!date) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}