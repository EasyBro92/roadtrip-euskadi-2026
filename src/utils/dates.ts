import { addDays, differenceInCalendarDays, formatISO, parseISO } from "date-fns";
import type { ISODate } from "../types";

export function toISODate(date: Date): ISODate {
  return formatISO(date, { representation: "date" });
}

export function parseISODate(date: ISODate): Date {
  return parseISO(date);
}

export function shiftISODate(date: ISODate, days: number): ISODate {
  return toISODate(addDays(parseISODate(date), days));
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(parseISODate(to), parseISODate(from));
}
