import { Injectable } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';
import { baseLocale, formatDate, parseDate } from './date-format';

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
 */
@Injectable()
export class PbDateAdapter extends NativeDateAdapter {
  displayFormat = 'd';
  editFormat = 'd';
  editing = false;
  firstDay: number | null = null;

  get localeId(): string {
    return typeof this.locale === 'string' ? baseLocale(this.locale) : 'en-US';
  }

  /** The calendar grid is Gregorian: locales whose default calendar differs (fa-IR, th-TH…) use it too. */
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
    }
    return super.parse(value, parseFormat);
  }

  override getFirstDayOfWeek(): number {
    return this.firstDay ?? super.getFirstDayOfWeek();
  }
}
