import { Injectable } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';
import { baseLocale, formatDate, localeNames, parseDate } from './date-format';
import { calendarDateOf, calendarOfLocale, calendarToDate, jalaliMonthLength, PbCalendarSystem } from './jalali';

/** The display format token pb-datepicker's input uses (anything else goes to the native adapter). */
export const PB_INPUT_FORMAT = 'pb-input';

export const PB_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: PB_INPUT_FORMAT },
  display: {
    dateInput: PB_INPUT_FORMAT,
    monthLabel: { month: 'short' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};

/**
 * NativeDateAdapter with pb-datepicker's formats: the input shows `displayFormat` while not focused and
 * `format` while editing, and parses typed text with `format` (then anything Date understands).
 * One instance per datepicker (component-level provider), configured by the datepicker's inputs.
 * A locale with "-u-ca-persian" switches the calendar grid, names and fields to the Persian (Jalali) calendar.
 */
@Injectable()
export class PbDateAdapter extends NativeDateAdapter {
  displayFormat = 'd';
  editFormat = 'd';
  editing = false;
  firstDay: number | null = null;

  get calendar(): PbCalendarSystem {
    return typeof this.locale === 'string' ? calendarOfLocale(this.locale) : 'gregorian';
  }

  /** The locale for date-format.ts: without extensions, plus "-u-ca-persian" for the Persian calendar. */
  get localeId(): string {
    const base = typeof this.locale === 'string' ? baseLocale(this.locale) : 'en-US';
    return this.calendar === 'persian' ? `${base}-u-ca-persian` : base;
  }

  /** The calendar grid is Gregorian unless the locale asks for Persian: locales whose default calendar differs (fa-IR, th-TH…) use Gregorian too. */
  override setLocale(locale: unknown): void {
    super.setLocale(typeof locale === 'string' && !locale.includes('-u-') ? `${locale}-u-ca-gregory` : locale);
  }

  override format(date: Date, displayFormat: object): string {
    if ((displayFormat as unknown) === PB_INPUT_FORMAT) {
      if (!this.isValid(date)) return '';
      return formatDate(date, this.editing ? this.editFormat : this.displayFormat, this.localeId);
    }
    return super.format(date, displayFormat);
  }

  override parse(value: unknown, parseFormat: object): Date | null {
    if (typeof value === 'string') {
      if (!value.trim()) return null;
      const parsed = parseDate(value, this.editFormat, this.localeId) ?? parseDate(value, 'd', this.localeId);
      if (parsed) return parsed;
      // Date.parse only understands Gregorian text.
      if (this.calendar === 'persian') return this.invalid();
    }
    return super.parse(value, parseFormat);
  }

  override getFirstDayOfWeek(): number {
    return this.firstDay ?? super.getFirstDayOfWeek();
  }

  // ------------------------------------------------------------------ Persian calendar fields

  override getYear(date: Date): number {
    return this.calendar === 'persian' ? calendarDateOf(date, 'persian').year : super.getYear(date);
  }

  override getMonth(date: Date): number {
    return this.calendar === 'persian' ? calendarDateOf(date, 'persian').month - 1 : super.getMonth(date);
  }

  override getDate(date: Date): number {
    return this.calendar === 'persian' ? calendarDateOf(date, 'persian').day : super.getDate(date);
  }

  override getNumDaysInMonth(date: Date): number {
    if (this.calendar !== 'persian') return super.getNumDaysInMonth(date);
    const { year, month } = calendarDateOf(date, 'persian');
    return jalaliMonthLength(year, month);
  }

  override getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
    if (this.calendar !== 'persian') return super.getMonthNames(style);
    const names = localeNames(this.localeId);
    return style === 'long' ? names.months : style === 'short' ? names.monthsShort : names.months.map((name) => name.charAt(0));
  }

  override getDateNames(): string[] {
    if (this.calendar !== 'persian') return super.getDateNames();
    const number = new Intl.NumberFormat(this.locale as string, { useGrouping: false });
    return Array.from({ length: 31 }, (_, i) => number.format(i + 1));
  }

  override getYearName(date: Date): string {
    if (this.calendar !== 'persian') return super.getYearName(date);
    return new Intl.NumberFormat(this.locale as string, { useGrouping: false }).format(this.getYear(date));
  }

  /** month is 0-based, like Date's. */
  override createDate(year: number, month: number, date: number): Date {
    if (this.calendar !== 'persian') return super.createDate(year, month, date);
    if (month < 0 || month > 11) throw Error(`Invalid month index "${month}". Month index has to be between 0 and 11.`);
    if (date < 1 || date > jalaliMonthLength(year, month + 1)) throw Error(`Invalid date "${date}" for month with index "${month}".`);
    return calendarToDate(year, month + 1, date, 'persian');
  }

  override addCalendarYears(date: Date, years: number): Date {
    return this.calendar === 'persian' ? this.addPersianMonths(date, years * 12) : super.addCalendarYears(date, years);
  }

  override addCalendarMonths(date: Date, months: number): Date {
    return this.calendar === 'persian' ? this.addPersianMonths(date, months) : super.addCalendarMonths(date, months);
  }

  /** Adds months and keeps the day, or the month's last day when it is shorter (31 Shahrivar + 1 month = 30 Mehr). */
  private addPersianMonths(date: Date, months: number): Date {
    const { year, month, day } = calendarDateOf(date, 'persian');
    const index = year * 12 + month - 1 + months;
    const y = Math.floor(index / 12);
    const m = index - y * 12 + 1;
    const result = calendarToDate(y, m, Math.min(day, jalaliMonthLength(y, m)), 'persian');
    result.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
    return result;
  }
}
