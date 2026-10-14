/*
 * The Persian (Jalali, Shamsi) calendar: conversions between Gregorian and Jalali year/month/day.
 * The 33-year-cycle algorithm with the leap-year breaks of the official calendar (valid for Jalali
 * years -61 to 3177), the same results as Intl's "persian" calendar and .NET's PersianCalendar today.
 */

/** Which calendar the date editors show and edit. */
export type PbCalendarSystem = 'gregorian' | 'persian';

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

/** The Gregorian year that a Jalali year starts in, the day of March it starts on, and its leap position (0 = leap). */
function jalaliYear(jy: number): { gy: number; march: number; leap: number } {
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  for (let i = 1; i < BREAKS.length; i++) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { gy, march, leap };
}

/** Julian day number of a Gregorian date. */
function gregorianToDay(gy: number, gm: number, gd: number): number {
  const d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}

function dayToGregorian(jdn: number): CalendarDate {
  let j = 4 * jdn + 139361631;
  j += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const day = div(mod(i, 153), 5) + 1;
  const month = mod(div(i, 153), 12) + 1;
  const year = div(j, 1461) - 100100 + div(8 - month, 6);
  return { year, month, day };
}

function jalaliToDay(jy: number, jm: number, jd: number): number {
  const { gy, march } = jalaliYear(jy);
  return gregorianToDay(gy, 3, march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function dayToJalali(jdn: number): CalendarDate {
  const gy = dayToGregorian(jdn).year;
  let year = gy - 621;
  const { march, leap } = jalaliYear(year);
  let k = jdn - gregorianToDay(gy, 3, march);
  if (k >= 0) {
    if (k <= 185) return { year, month: 1 + div(k, 31), day: mod(k, 31) + 1 };
    k -= 186;
  } else {
    year -= 1;
    k += 179;
    if (leap === 1) k += 1;
  }
  return { year, month: 7 + div(k, 30), day: mod(k, 30) + 1 };
}

export const gregorianToJalali = (year: number, month: number, day: number): CalendarDate => dayToJalali(gregorianToDay(year, month, day));

export const jalaliToGregorian = (year: number, month: number, day: number): CalendarDate => dayToGregorian(jalaliToDay(year, month, day));

export const isJalaliLeapYear = (year: number) => jalaliYear(year).leap === 0;

/** Farvardin to Shahrivar have 31 days, Mehr to Bahman 30, Esfand 29 (30 in a leap year). */
export const jalaliMonthLength = (year: number, month: number) => (month <= 6 ? 31 : month <= 11 ? 30 : isJalaliLeapYear(year) ? 30 : 29);

// ------------------------------------------------------------------ calendar-neutral helpers

/** A Gregorian year/month/day in the given calendar. */
export const toCalendarDate = (date: CalendarDate, calendar: PbCalendarSystem): CalendarDate =>
  calendar === 'persian' ? gregorianToJalali(date.year, date.month, date.day) : date;

/** A year/month/day of the given calendar in the Gregorian calendar. */
export const fromCalendarDate = (date: CalendarDate, calendar: PbCalendarSystem): CalendarDate =>
  calendar === 'persian' ? jalaliToGregorian(date.year, date.month, date.day) : date;

export const daysInCalendarMonth = (year: number, month: number, calendar: PbCalendarSystem) =>
  calendar === 'persian' ? jalaliMonthLength(year, month) : new Date(year, month, 0).getDate();

/** The calendar's year/month/day of a local Date. */
export const calendarDateOf = (date: Date, calendar: PbCalendarSystem): CalendarDate =>
  toCalendarDate({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }, calendar);

/** A local Date (midnight unless a time is given) from the calendar's year/month/day. */
export function calendarToDate(year: number, month: number, day: number, calendar: PbCalendarSystem, hours = 0, minutes = 0, seconds = 0): Date {
  const g = fromCalendarDate({ year, month, day }, calendar);
  const date = new Date(g.year, g.month - 1, g.day, hours, minutes, seconds);
  date.setFullYear(g.year);
  return date;
}

/** The calendar a locale asks for: a "-u-ca-persian" extension (e.g. "fa-IR-u-ca-persian") means Persian. */
export const calendarOfLocale = (locale: string): PbCalendarSystem => (/-u-(?:.*-)?ca-persian\b/.test(locale) ? 'persian' : 'gregorian');
