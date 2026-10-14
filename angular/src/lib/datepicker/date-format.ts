import { calendarOfLocale, calendarToDate, daysInCalendarMonth, fromCalendarDate, PbCalendarSystem, toCalendarDate } from './jalali';

/*
 * Date formats for pb-datepicker, matching the Blazor PBDatepicker: .NET-style patterns (d, dd, ddd, dddd,
 * M, MM, MMM, MMMM, y, yy, yyyy, H, HH, h, hh, m, mm, s, ss, t, tt, z, zz, zzz, 'literal') and the
 * standard one-letter formats (d, D, g, G, t, T, Y, M) expanded from the locale with Intl.
 * A locale with "-u-ca-persian" (e.g. "fa-IR-u-ca-persian") formats, parses and names Jalali dates.
 */

export type DateSectionKind =
  | 'literal'
  | 'day'
  | 'weekday'
  | 'month'
  | 'monthName'
  | 'year'
  | 'hour24'
  | 'hour12'
  | 'minute'
  | 'second'
  | 'fraction'
  | 'ampm'
  | 'offset';

export interface DateSection {
  kind: DateSectionKind;
  length: number;
  text?: string;
}

export interface LocaleNames {
  months: string[];
  monthsShort: string[];
  days: string[];
  daysShort: string[];
  am: string;
  pm: string;
  /** The calendar the names and the year/month/day fields belong to. */
  calendar: PbCalendarSystem;
}

/** Latin digits and the locale's calendar (Gregorian unless it asks for Persian): patterns and names stay parseable. */
const intlLocale = (locale: string) => `${baseLocale(locale)}-u-ca-${calendarOfLocale(locale) === 'persian' ? 'persian' : 'gregory'}-nu-latn`;

/** The locale without Unicode extensions ("fa-IR-u-ca-gregory" -> "fa-IR"). */
export const baseLocale = (locale: string) => locale.split("-u-")[0];

const namesCache = new Map<string, LocaleNames>();

export function localeNames(locale: string): LocaleNames {
  let names = namesCache.get(locale);
  if (names) return names;
  const loc = intlLocale(locale);
  const calendar = calendarOfLocale(locale);
  // The 1st of each month of 2021 (Gregorian) or 1400 (Persian), at noon UTC.
  const monthStart = (m: number) => {
    const g = fromCalendarDate({ year: calendar === 'persian' ? 1400 : 2021, month: m + 1, day: 1 }, calendar);
    return Date.UTC(g.year, g.month - 1, g.day, 12);
  };
  const month = (style: 'long' | 'short') => Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat(loc, { month: style, timeZone: 'UTC' }).format(monthStart(m)));
  // 2021-01-03 was a Sunday.
  const day = (style: 'long' | 'short') => Array.from({ length: 7 }, (_, d) => new Intl.DateTimeFormat(loc, { weekday: style, timeZone: 'UTC' }).format(Date.UTC(2021, 0, 3 + d)));
  const period = (hour: number) =>
    new Intl.DateTimeFormat(loc, { hour: 'numeric', hour12: true, timeZone: 'UTC' }).formatToParts(Date.UTC(2021, 0, 1, hour)).find((p) => p.type === 'dayPeriod')?.value ?? (hour < 12 ? 'AM' : 'PM');
  names = { months: month('long'), monthsShort: month('short'), days: day('long'), daysShort: day('short'), am: period(9), pm: period(15), calendar };
  namesCache.set(locale, names);
  return names;
}

const STANDARD: Record<string, Intl.DateTimeFormatOptions> = {
  d: { year: 'numeric', month: 'numeric', day: 'numeric' },
  D: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  f: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  F: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' },
  g: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  G: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' },
  t: { hour: 'numeric', minute: '2-digit' },
  T: { hour: 'numeric', minute: '2-digit', second: '2-digit' },
  Y: { year: 'numeric', month: 'long' },
  y: { year: 'numeric', month: 'long' },
  M: { month: 'long', day: 'numeric' },
  m: { month: 'long', day: 'numeric' },
};

const patternCache = new Map<string, string>();

/** Expands a one-letter standard format to the locale's pattern ("d" -> "M/d/yyyy" in en-US). */
export function expandFormat(format: string, locale: string): string {
  const options = format.length === 1 ? STANDARD[format] : undefined;
  if (!options) return format;
  const key = `${locale}|${format}`;
  const cached = patternCache.get(key);
  if (cached) return cached;
  // 2026-03-05 (Persian: 1405-03-05) 13:07:09: single-digit month and day tell numeric from 2-digit.
  const names = localeNames(locale);
  const sample = calendarToDate(names.calendar === 'persian' ? 1405 : 2026, 3, 5, names.calendar, 13, 7, 9);
  let pattern = '';
  for (const part of new Intl.DateTimeFormat(intlLocale(locale), options).formatToParts(sample)) {
    switch (part.type) {
      case 'year':
        pattern += part.value.length === 2 ? 'yy' : 'yyyy';
        break;
      case 'month':
        pattern += /^\d+$/.test(part.value) ? (part.value.length === 2 ? 'MM' : 'M') : part.value === names.months[2] ? 'MMMM' : 'MMM';
        break;
      case 'day':
        pattern += part.value.length === 2 ? 'dd' : 'd';
        break;
      case 'weekday':
        pattern += part.value === names.days[sample.getDay()] ? 'dddd' : 'ddd';
        break;
      case 'hour':
        pattern += part.value === '13' ? 'H' : part.value.length === 2 ? 'hh' : 'h';
        if (part.value === '13' && options.hour === '2-digit') pattern += 'H';
        break;
      case 'minute':
        pattern += 'mm';
        break;
      case 'second':
        pattern += 'ss';
        break;
      case 'dayPeriod':
        pattern += 'tt';
        break;
      default:
        pattern += `'${part.value.replace(/'/g, '')}'`;
    }
  }
  patternCache.set(key, pattern);
  return pattern;
}

export function parseSections(format: string, locale: string): DateSection[] {
  const pattern = expandFormat(format, locale);
  const sections: DateSection[] = [];
  let literal = '';
  const flush = () => {
    if (literal) sections.push({ kind: 'literal', length: literal.length, text: literal });
    literal = '';
  };
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "'" || c === '"') {
      let end = pattern.indexOf(c, i + 1);
      if (end < 0) end = pattern.length;
      literal += pattern.slice(i + 1, end);
      i = end;
      continue;
    }
    if (c === '\\' && i + 1 < pattern.length) {
      literal += pattern[++i];
      continue;
    }
    if ('dMyHhmsftz'.includes(c)) {
      let length = 1;
      while (pattern[i + length] === c) length++;
      flush();
      const kind: DateSectionKind =
        c === 'd' ? (length >= 3 ? 'weekday' : 'day')
        : c === 'M' ? (length >= 3 ? 'monthName' : 'month')
        : c === 'y' ? 'year'
        : c === 'H' ? 'hour24'
        : c === 'h' ? 'hour12'
        : c === 'm' ? 'minute'
        : c === 's' ? 'second'
        : c === 'f' ? 'fraction'
        : c === 't' ? 'ampm'
        : 'offset';
      sections.push({ kind, length });
      i += length - 1;
      continue;
    }
    literal += c;
  }
  flush();
  return sections;
}

export function hasTime(format: string, locale: string): boolean {
  return parseSections(format, locale).some((s) => s.kind === 'hour24' || s.kind === 'hour12' || s.kind === 'minute' || s.kind === 'second');
}

export function hasOffset(format: string, locale: string): boolean {
  return parseSections(format, locale).some((s) => s.kind === 'offset');
}

const pad = (n: number, length: number) => String(Math.abs(n)).padStart(length, '0');

/** Clock fields of a date, at a UTC offset (minutes) or in the browser's time zone. */
export interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  offset: number;
}

/** The year, month and day are the calendar's (Jalali for 'persian'). */
export function toParts(date: Date, offset?: number, calendar: PbCalendarSystem = 'gregorian'): DateParts {
  let parts: DateParts;
  if (offset == null) {
    parts = { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds(), offset: -date.getTimezoneOffset() };
  } else {
    const shifted = new Date(date.getTime() + offset * 60000);
    parts = { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate(), hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes(), second: shifted.getUTCSeconds(), offset };
  }
  return calendar === 'gregorian' ? parts : { ...parts, ...toCalendarDate(parts, calendar) };
}

export function fromParts(parts: DateParts, withOffset: boolean, calendar: PbCalendarSystem = 'gregorian'): Date {
  if (calendar !== 'gregorian') parts = { ...parts, ...fromCalendarDate(parts, calendar) };
  if (!withOffset) {
    const date = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    date.setFullYear(parts.year);
    return date;
  }
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
  utc.setUTCFullYear(parts.year);
  return new Date(utc.getTime() - parts.offset * 60000);
}

export function sectionText(section: DateSection, parts: DateParts, names: LocaleNames): string {
  switch (section.kind) {
    case 'literal':
      return section.text ?? '';
    case 'day':
      return section.length >= 2 ? pad(parts.day, 2) : String(parts.day);
    case 'month':
      return section.length >= 2 ? pad(parts.month, 2) : String(parts.month);
    case 'monthName':
      return (section.length === 3 ? names.monthsShort : names.months)[parts.month - 1];
    case 'year':
      return section.length <= 2 ? pad(parts.year % 100, 2) : pad(parts.year, Math.max(4, section.length));
    case 'hour24':
      return section.length >= 2 ? pad(parts.hour, 2) : String(parts.hour);
    case 'hour12': {
      const h = parts.hour % 12 || 12;
      return section.length >= 2 ? pad(h, 2) : String(h);
    }
    case 'minute':
      return section.length >= 2 ? pad(parts.minute, 2) : String(parts.minute);
    case 'second':
      return section.length >= 2 ? pad(parts.second, 2) : String(parts.second);
    case 'fraction':
      return '0'.repeat(section.length);
    case 'ampm': {
      const t = parts.hour < 12 ? names.am : names.pm;
      return section.length === 1 ? t.charAt(0) : t;
    }
    case 'weekday': {
      const g = fromCalendarDate(parts, names.calendar);
      const day = new Date(Date.UTC(g.year, g.month - 1, g.day)).getUTCDay();
      return (section.length === 3 ? names.daysShort : names.days)[day];
    }
    case 'offset': {
      const sign = parts.offset < 0 ? '-' : '+';
      const h = Math.floor(Math.abs(parts.offset) / 60);
      const m = Math.abs(parts.offset) % 60;
      return section.length === 1 ? `${sign}${h}` : section.length === 2 ? `${sign}${pad(h, 2)}` : `${sign}${pad(h, 2)}:${pad(m, 2)}`;
    }
  }
}

export function formatDate(date: Date, format: string, locale: string, offset?: number): string {
  const sections = parseSections(format, locale);
  const withOffset = sections.some((s) => s.kind === 'offset');
  const names = localeNames(locale);
  const parts = toParts(date, withOffset ? (offset ?? -date.getTimezoneOffset()) : undefined, names.calendar);
  return sections.map((s) => sectionText(s, parts, names)).join('');
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Parses text in the given format (lenient about spaces and separators); null when it doesn't match. */
export function parseDate(text: string, format: string, locale: string): Date | null {
  const sections = parseSections(format, locale);
  const names = localeNames(locale);
  const groups: DateSection[] = [];
  let regex = '^\\s*';
  for (const section of sections) {
    if (section.kind === 'literal') {
      regex += section.text!.trim() ? `\\s*${escapeRegExp(section.text!.trim())}\\s*` : '\\s+';
      continue;
    }
    groups.push(section);
    switch (section.kind) {
      case 'monthName':
        regex += `(${[...names.months, ...names.monthsShort].map(escapeRegExp).sort((a, b) => b.length - a.length).join('|')})\\.?`;
        break;
      case 'weekday':
        regex += `(${[...names.days, ...names.daysShort].map(escapeRegExp).join('|')})\\.?`;
        break;
      case 'ampm':
        regex += `(${escapeRegExp(names.am)}|${escapeRegExp(names.pm)}|[ap]\\.?m?\\.?)`;
        break;
      case 'offset':
        regex += '([+-]\\d{1,2}(?::?\\d{2})?|Z)';
        break;
      case 'year':
        regex += section.length <= 2 ? '(\\d{1,2})' : '(\\d{1,4})';
        break;
      case 'fraction':
        regex += '(\\d+)';
        break;
      default:
        regex += '(\\d{1,2})';
    }
  }
  const match = new RegExp(regex + '\\s*$', 'i').exec(text);
  if (!match) return null;
  const now = new Date();
  const parts: DateParts = { year: toParts(now, undefined, names.calendar).year, month: 1, day: 1, hour: 0, minute: 0, second: 0, offset: -now.getTimezoneOffset() };
  let pm: boolean | null = null;
  let withOffset = false;
  groups.forEach((section, i) => {
    const value = match[i + 1];
    const n = Number(value);
    switch (section.kind) {
      case 'day':
        parts.day = n;
        break;
      case 'month':
        parts.month = n;
        break;
      case 'monthName': {
        const lower = value.toLocaleLowerCase(locale);
        let index = names.months.findIndex((m) => m.toLocaleLowerCase(locale) === lower);
        if (index < 0) index = names.monthsShort.findIndex((m) => m.toLocaleLowerCase(locale).replace('.', '') === lower.replace('.', ''));
        parts.month = index + 1;
        break;
      }
      case 'year':
        parts.year = section.length <= 2 || value.length <= 2 ? (names.calendar === 'persian' ? 1400 : 2000) + n : n;
        break;
      case 'hour24':
      case 'hour12':
        parts.hour = n;
        break;
      case 'minute':
        parts.minute = n;
        break;
      case 'second':
        parts.second = n;
        break;
      case 'ampm': {
        const v = value.toLocaleLowerCase(locale);
        pm = v === names.pm.toLocaleLowerCase(locale) || (v !== names.am.toLocaleLowerCase(locale) && v.startsWith('p'));
        break;
      }
      case 'offset': {
        withOffset = true;
        if (value.toUpperCase() === 'Z') parts.offset = 0;
        else {
          const sign = value.startsWith('-') ? -1 : 1;
          const digits = value.slice(1).replace(':', '');
          parts.offset = sign * (Number(digits.slice(0, digits.length > 2 ? digits.length - 2 : digits.length)) * 60 + (digits.length > 2 ? Number(digits.slice(-2)) : 0));
        }
        break;
      }
    }
  });
  if (pm !== null) parts.hour = (parts.hour % 12) + (pm ? 12 : 0);
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > daysInCalendarMonth(parts.year, parts.month, names.calendar)) return null;
  if (parts.hour > 23 || parts.minute > 59 || parts.second > 59) return null;
  return fromParts(parts, withOffset, names.calendar);
}
