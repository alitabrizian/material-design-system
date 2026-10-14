import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  TemplateRef,
  Type,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import {
  MatCalendarCellClassFunction,
  MatDatepicker,
  MatDatepickerActions,
  MatDatepickerApply,
  MatDatepickerCancel,
  MatDatepickerInput,
  MatDatepickerToggle,
  MatDatepickerToggleIcon,
} from '@angular/material/datepicker';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { PbFieldBase, providePbValueAccessor } from '../core/value-accessor';
import { PB_DATE_FORMATS, PB_INPUT_FORMAT, PbDateAdapter } from './date-adapter';
import { baseLocale, expandFormat, localeNames, parseSections } from './date-format';
import { DateMask } from './date-mask';
import { PbCalendarSystem } from './jalali';
import { PbScrollPicker } from './scroll-picker';

/** The locale with the calendar system applied ("fa-IR" + 'persian' = "fa-IR-u-ca-persian"). */
export function calendarLocale(locale: string, calendarSystem: PbCalendarSystem | undefined): string {
  if (calendarSystem === 'persian') return `${baseLocale(locale)}-u-ca-persian`;
  if (calendarSystem === 'gregorian') return baseLocale(locale);
  return locale;
}

/** Month picks days; year picks a month; decade picks a year. */
export type PbCalendarViewMode = 'month' | 'year' | 'decade';
export type PbDatePickerDisplayMode = 'auto' | 'calendar' | 'scrollPicker';
export type PbClearButtonDisplayMode = 'never' | 'auto';
export type PbMaskCaretMode = 'advancing' | 'regular';

const BELOW: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: -18 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
];

/**
 * Material 3 datepicker (PBDatepicker) with the DevExpress Date Edit's features: type or pick a date,
 * a time section, clear button and placeholder, display and edit formats, date-time masks (Up/Down and
 * the mouse wheel change a section), min/max and disabled dates, month/year/decade picking, highlighted
 * days, and an adaptive scroll picker. Bind [(value)] or use it as a form control.
 */
@Component({
  selector: 'pb-datepicker',
  imports: [
    MatFormField,
    MatLabel,
    MatInput,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDatepickerToggleIcon,
    MatDatepickerActions,
    MatDatepickerApply,
    MatDatepickerCancel,
    MatSuffix,
    MatHint,
    MatError,
    MatButton,
    MatIconButton,
    CdkOverlayOrigin,
    CdkConnectedOverlay,
    PbScrollPicker,
    NgTemplateOutlet,
  ],
  providers: [
    { provide: DateAdapter, useClass: PbDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: PB_DATE_FORMATS },
    providePbValueAccessor(() => PbDatepicker),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './datepicker.html',
  styleUrl: './datepicker.css',
})
export class PbDatepicker extends PbFieldBase<Date | null> {
  readonly value = model<Date | null>(null);
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  /** Disables dates by custom logic: return true for a disabled date. */
  readonly customDisabledDate = input<((date: Date) => boolean) | null>(null);
  /** Extra CSS classes for calendar cells (highlight special dates). */
  readonly dayCellClass = input<MatCalendarCellClassFunction<Date> | null>(null);
  readonly calendarViewMode = input<PbCalendarViewMode>('month');
  readonly timeSectionVisible = input(false, { transform: booleanAttribute });
  /** Time editors: "t" (locale short time), "T" (with seconds) or a pattern like "HH:mm:ss". */
  readonly timeSectionFormat = input('t');
  readonly nullText = input<string>();
  readonly clearButtonDisplayMode = input<PbClearButtonDisplayMode>('never');
  /** Text while not focused (standard "d", "D", "g"… or a pattern like "dd MMM yyyy"). */
  readonly displayFormat = input<string>();
  /** Text while editing, also used to parse typed text. */
  readonly format = input<string>();
  /** A date-time mask pattern, e.g. "d", "dd/MM/yyyy HH:mm", "MMMM d, yyyy", "yyyy-MM-dd HH:mm zzz". */
  readonly mask = input<string>();
  readonly maskCaretMode = input<PbMaskCaretMode>('advancing');
  readonly maskCascadingSectionUpdates = input(true, { transform: booleanAttribute });
  /** Locale for formats and names (defaults to MAT_DATE_LOCALE). */
  readonly locale = input<string>();
  /** 'persian' shows and edits Persian (Jalali, Shamsi) dates; the value stays a Date. Defaults to the locale's ("-u-ca-persian"), else Gregorian. */
  readonly calendarSystem = input<PbCalendarSystem>();
  /** 0 = Sunday … 6 = Saturday. */
  readonly firstDayOfWeek = input<number | null>(null);
  readonly pickerDisplayMode = input<PbDatePickerDisplayMode>('auto');
  readonly scrollPickerFormat = input('d MMMM yyyy');
  readonly timeSectionScrollPickerFormat = input('HH mm');
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly showDropDownButton = input(true, { transform: booleanAttribute });
  readonly dropDownVisible = model(false);
  /** Cancel/Apply buttons: picking only stages the date until Apply. */
  readonly showActionButtons = input(false, { transform: booleanAttribute });
  /** Material icon name of the calendar button (e.g. "keyboard_arrow_down"). */
  readonly toggleIcon = input<string>();
  /** Disables typing but keeps the calendar. */
  readonly inputDisabled = input(false, { transform: booleanAttribute });
  /** Disables the calendar button and popup but keeps typing. */
  readonly pickerDisabled = input(false, { transform: booleanAttribute });
  /** Shows the calendar in a modal dialog with larger cells. */
  readonly touchUi = input(false, { transform: booleanAttribute });
  /** The date the calendar opens at while the value is empty. */
  readonly startAt = input<Date | null>(null);
  /** The view the calendar opens in. */
  readonly startView = input<PbCalendarViewMode | null>(null);
  /** A custom calendar header component (mat-datepicker calendarHeaderComponent). */
  readonly calendarHeader = input<Type<unknown> | null>(null);
  /** The parsed date while the user types (null while the text is not a date). */
  readonly dateInput = output<Date | null>();
  /** The date after a change (typed and committed, picked, or cleared). */
  readonly dateChange = output<Date | null>();

  protected readonly valueModel = this.value;
  private readonly adapter = inject(DateAdapter) as PbDateAdapter;
  private readonly defaultLocale = String(inject(MAT_DATE_LOCALE, { optional: true }) ?? 'en-US');
  private readonly dialog = inject(MatDialog);
  private readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly datepickerInput = viewChild.required(MatDatepickerInput);
  private readonly picker = viewChild.required<MatDatepicker<Date>>('picker');
  private readonly scrollTemplate = viewChild.required<TemplateRef<unknown>>('scrollTemplate');
  private maskEngine: DateMask | null = null;
  private dialogRef: MatDialogRef<unknown> | null = null;

  protected readonly scrollOpen = signal(false);
  protected readonly pending = signal<Date>(new Date());
  protected readonly hour = signal(0);
  protected readonly minute = signal(0);
  protected readonly second = signal(0);
  protected readonly positions = BELOW;

  protected readonly localeId = computed(() => calendarLocale(this.locale() ?? this.defaultLocale, this.calendarSystem()));
  protected readonly editFormat = computed(() => this.format() ?? this.mask() ?? (this.calendarViewMode() === 'year' ? 'Y' : this.calendarViewMode() === 'decade' ? 'yyyy' : this.timeSectionVisible() ? 'g' : 'd'));
  protected readonly openView = computed(() => {
    const view = this.startView() ?? this.calendarViewMode();
    return view === 'decade' || this.calendarViewMode() === 'decade' ? 'multi-year' : view === 'year' || this.calendarViewMode() === 'year' ? 'year' : 'month';
  });
  protected readonly filter = computed(() => {
    const custom = this.customDisabledDate();
    return (date: Date | null) => !date || !custom?.(date);
  });
  protected readonly cellClass = computed<MatCalendarCellClassFunction<Date>>(() => this.dayCellClass() ?? (() => ''));
  protected readonly twelveHour = computed(() => expandFormat(this.timeSectionFormat(), this.localeId()).includes('h'));
  protected readonly showSeconds = computed(() => expandFormat(this.timeSectionFormat(), this.localeId()).includes('s'));
  protected readonly names = computed(() => localeNames(this.localeId()));
  protected readonly scrollFormat = computed(() => (this.timeSectionVisible() ? `${this.scrollPickerFormat()} ${this.timeSectionScrollPickerFormat()}` : this.scrollPickerFormat()));
  protected readonly showClear = computed(() => this.clearButtonDisplayMode() === 'auto' && !!this.value() && !this.readOnly() && !this.isDisabled());
  protected readonly usesScrollPicker = computed(() => this.pickerDisplayMode() === 'scrollPicker');
  protected readonly allowedFn = (date: Date) => this.allowed(date);

  constructor() {
    super();
    // Configure this datepicker's adapter; re-setting the locale makes the input re-format its text.
    effect(() => {
      const locale = this.localeId();
      const edit = this.editFormat();
      const display = this.displayFormat() ?? edit;
      const firstDay = this.firstDayOfWeek();
      untracked(() => {
        this.adapter.editFormat = edit;
        this.adapter.displayFormat = display;
        this.adapter.firstDay = firstDay;
        this.adapter.setLocale(locale);
      });
    });
    effect(() => {
      const open = this.dropDownVisible();
      untracked(() => (open ? this.open() : this.close()));
    });
    // The mask engine owns the input text while a mask is set.
    effect(() => {
      const mask = this.mask();
      const value = this.value();
      const options = this.maskOptions();
      untracked(() => {
        if (!mask) {
          this.maskEngine?.destroy();
          this.maskEngine = null;
          return;
        }
        if (!this.maskEngine) this.maskEngine = new DateMask(this.inputElement().nativeElement, options, (date) => this.onMaskChanged(date));
        this.maskEngine.update(value, options);
      });
    });
    afterNextRender(() => this.maskEngine?.update(this.value(), this.maskOptions()));
    inject(DestroyRef).onDestroy(() => {
      this.maskEngine?.destroy();
      this.dialogRef?.close();
    });
  }

  private readonly maskOptions = computed(() => ({
    sections: parseSections(this.mask() ?? 'd', this.localeId()),
    names: this.names(),
    caretMode: this.maskCaretMode(),
    cascade: this.maskCascadingSectionUpdates(),
    readOnly: this.readOnly() || this.isDisabled(),
  }));

  private allowed(date: Date): boolean {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const min = this.min();
    const max = this.max();
    if (min && day < new Date(min.getFullYear(), min.getMonth(), min.getDate())) return false;
    if (max && day > new Date(max.getFullYear(), max.getMonth(), max.getDate())) return false;
    return !this.customDisabledDate()?.(day);
  }

  /** Puts the current value back into the input (after invalid or out-of-range input). */
  private restoreText(): void {
    if (this.maskEngine) this.maskEngine.update(this.value(), this.maskOptions());
    else this.datepickerInput().value = this.value();
  }

  private commit(date: Date | null): void {
    const changed = date?.getTime() !== this.value()?.getTime();
    this.update(date);
    this.restoreText();
    if (changed) this.dateChange.emit(date);
  }

  protected onDateInput(date: Date | null): void {
    this.dateInput.emit(date && this.allowed(date) ? date : null);
  }

  // ------------------------------------------------------------------ input

  protected onDateChange(date: Date | null): void {
    if (this.mask()) return;
    const text = this.inputElement().nativeElement.value.trim();
    if (!date) {
      // Invalid text keeps the previous value (DevExpress behavior); empty text clears it.
      if (text) this.restoreText();
      else this.commit(null);
      return;
    }
    if (!this.allowed(date)) {
      this.restoreText();
      return;
    }
    const current = this.value();
    if (current && !this.timeSectionVisible() && !parseSections(this.editFormat(), this.localeId()).some((s) => s.kind.startsWith('hour'))) {
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate(), current.getHours(), current.getMinutes(), current.getSeconds());
    }
    this.commit(date);
  }

  private onMaskChanged(date: Date | null): void {
    if (date && !this.allowed(date)) {
      this.restoreText();
      return;
    }
    this.update(date);
    this.dateChange.emit(date);
  }

  protected onFocus(): void {
    this.adapter.editing = true;
    if (!this.mask() && this.value()) this.inputElement().nativeElement.value = this.adapter.format(this.value()!, PB_INPUT_FORMAT as unknown as object);
  }

  protected onBlur(): void {
    this.adapter.editing = false;
    this.markTouched();
    if (!this.mask()) setTimeout(() => this.restoreText(), 0);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'F4') {
      event.preventDefault();
      this.open();
    }
  }

  clear(): void {
    if (this.readOnly() || this.isDisabled()) return;
    this.commit(null);
    this.inputElement().nativeElement.focus();
  }

  // ------------------------------------------------------------------ dropdown

  open(): void {
    if (this.readOnly() || this.isDisabled() || this.pickerDisabled()) return;
    const mode = this.pickerDisplayMode();
    const phone = mode === 'auto' && matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
    if (mode === 'scrollPicker' || phone) {
      this.pending.set(this.value() ?? this.defaultDate());
      if (phone) {
        this.dialogRef = this.dialog.open(this.scrollTemplate(), { panelClass: 'pb-date-edit__dialog', ariaLabel: this.label() ?? 'Choose date' });
        this.dialogRef.afterClosed().subscribe(() => {
          this.dialogRef = null;
          this.dropDownVisible.set(false);
        });
      } else this.scrollOpen.set(true);
    } else if (!this.picker().opened) this.picker().open();
    this.dropDownVisible.set(true);
  }

  close(): void {
    this.scrollOpen.set(false);
    this.dialogRef?.close();
    if (this.picker().opened) this.picker().close();
  }

  protected toggleFromButton(): void {
    if (this.scrollOpen() || this.picker().opened) this.close();
    else this.open();
  }

  private defaultDate(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const min = this.min();
    const max = this.max();
    if (min && today < min) return new Date(min);
    if (max && today > max) return new Date(max);
    return today;
  }

  protected onOpened(): void {
    const value = this.value() ?? new Date(new Date().setHours(0, 0, 0, 0));
    this.hour.set(value.getHours());
    this.minute.set(value.getMinutes());
    this.second.set(value.getSeconds());
    this.dropDownVisible.set(true);
  }

  protected onClosed(): void {
    this.dropDownVisible.set(false);
    this.inputElement().nativeElement.focus();
  }

  protected onMonthSelected(date: Date): void {
    if (this.calendarViewMode() !== 'year') return;
    this.commit(this.adapter.createDate(this.adapter.getYear(date), this.adapter.getMonth(date), 1));
    this.picker().close();
  }

  protected onYearSelected(date: Date): void {
    if (this.calendarViewMode() !== 'decade') return;
    this.commit(this.adapter.createDate(this.adapter.getYear(date), 0, 1));
    this.picker().close();
  }

  // ------------------------------------------------------------------ time section

  protected displayHour(): number {
    const h = this.hour();
    return this.twelveHour() ? h % 12 || 12 : h;
  }

  protected setTime(part: 'hour' | 'minute' | 'second', text: string): void {
    const n = Number(text);
    if (Number.isNaN(n)) return;
    if (part === 'hour') this.hour.set(this.twelveHour() ? (Math.min(12, Math.max(1, n)) % 12) + (this.hour() >= 12 ? 12 : 0) : Math.min(23, Math.max(0, n)));
    else if (part === 'minute') this.minute.set(Math.min(59, Math.max(0, n)));
    else this.second.set(Math.min(59, Math.max(0, n)));
  }

  protected setPm(pm: boolean): void {
    const h = this.hour();
    if (h >= 12 !== pm) this.hour.set(pm ? h + 12 : h - 12);
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  /** OK: matDatepickerApply sets the date first; then the time fields are merged in. */
  protected applyTime(): void {
    setTimeout(() => {
      const date = this.value() ?? this.defaultDate();
      const merged = new Date(date.getFullYear(), date.getMonth(), date.getDate(), this.hour(), this.minute(), this.second());
      if (this.allowed(merged)) this.commit(merged);
    });
  }

  protected now(): void {
    const now = new Date();
    this.hour.set(now.getHours());
    this.minute.set(now.getMinutes());
    this.second.set(now.getSeconds());
    this.commit(now);
    this.picker().close();
  }

  // ------------------------------------------------------------------ scroll picker

  protected applyScroll(): void {
    const value = this.pending();
    if (this.allowed(value)) this.commit(this.calendarViewMode() === 'month' ? value : this.adapter.createDate(this.adapter.getYear(value), this.calendarViewMode() === 'year' ? this.adapter.getMonth(value) : 0, 1));
    this.close();
    this.inputElement().nativeElement.focus();
  }

  protected cancelScroll(): void {
    this.close();
    this.inputElement().nativeElement.focus();
  }
}
