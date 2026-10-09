import type { LineTimetable } from "../types/transit";

export function warsawClock(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return { iso: `${value("year")}-${value("month")}-${value("day")}`, day: value("weekday") === "Sat" ? "sobota" : value("weekday") === "Sun" ? "niedziela" : "robocze", minutes: Number(value("hour")) * 60 + Number(value("minute")) };
}

export function timetableDayKey(key: string) {
  return ({ "pn-pt": "robocze", sob: "sobota", ndz: "niedziela" } as Record<string, string>)[key] ?? key;
}

export function preferredTimetableVariant(data: LineTimetable, direction: string): number {
  const normalize = (text: string) => text.toLocaleLowerCase("pl").trim().replace(/\s+/g, " ");
  const chosen = normalize(direction);
  const exact = data.warianty.find(variant => normalize(variant.kierunek) === chosen);
  const partial = chosen ? data.warianty.find(variant => normalize(variant.kierunek).includes(chosen) || chosen.includes(normalize(variant.kierunek))) : undefined;
  return exact?.idx ?? partial?.idx ?? data.warianty[0]?.idx ?? -1;
}

export function timetableValidity(date: string | null | undefined): string {
  if (!date) return "";
  const normalized = /^\d{8}$/.test(date) ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return "";
  return normalized.split("-").reverse().join(".");
}
