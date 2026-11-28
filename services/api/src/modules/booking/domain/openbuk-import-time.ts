import { createHash } from "node:crypto";
import type { OpenBukImportConfirmedRow } from "@corely/contracts";

export function importDigest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function sourceTimezone(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    calendar: "gregory",
    numberingSystem: "latn",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "longOffset",
  });
}

function matchesOffset(timestamp: string, formatter: Intl.DateTimeFormat) {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(timestamp)).map(({ type, value }) => [type, value])
  );
  const zoneOffset = parts.timeZoneName === "GMT" ? "+00:00" : parts.timeZoneName.slice(3);
  const local =
    parts.year +
    "-" +
    parts.month +
    "-" +
    parts.day +
    "T" +
    parts.hour +
    ":" +
    parts.minute +
    ":" +
    parts.second;
  const givenOffset = timestamp.endsWith("Z") ? "+00:00" : timestamp.slice(-6);
  return timestamp.slice(0, 19) === local && givenOffset === zoneOffset;
}

export function matchesSourceTime(row: OpenBukImportConfirmedRow, source: Intl.DateTimeFormat) {
  return (
    Date.parse(row.startAt) < Date.parse(row.endAt) &&
    matchesOffset(row.startAt, source) &&
    matchesOffset(row.endAt, source)
  );
}
