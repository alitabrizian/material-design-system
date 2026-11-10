import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  inject,
  Injectable,
  input,
  model,
  signal,
  Type,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { DateAdapter, ErrorStateMatcher, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import {
  DateRange,
  DefaultMatCalendarRangeStrategy,
  MAT_DATE_RANGE_SELECTION_STRATEGY,
  MatCalendar,
  MatCalendarCellClassFunction,
  MatDateRangeInput,
  MatDateRangePicker,
  MatDateRangeSelectionStrategy,
  MatDatepickerActions,
  MatDatepickerApply,
  MatDatepickerCancel,
  MatDatepickerToggle,
  MatDatepickerToggleIcon,
  MatEndDate,
  MatStartDate,
} from '@angular/material/datepicker';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { PbFormFieldAppearance, providePbValueAccessor } from '../core/value-accessor';
import { PB_DATE_FORMATS, PbDateAdapter } from './date-adapter';
import { calendarLocale, PbCalendarViewMode, PbClearButtonDisplayMode } from './datepicker';
import { calendarOfLocale, PbCalendarSystem } from './jalali';
import { PbLayerOrder } from '../core/layer-order';

/** A date range: the value of pb-date-range-picker as a form control. */
export interface PbDateRange {
  start: Date | null;
  end: Date | null;
}

/** Maps a clicked (or hovered) date to the whole range, e.g. the five days around it. */
export type PbRangeSelectionStrategy = (date: Date) => { start: Date; end: Date };

/** Delegates to the picker's selectionStrategy input, or Angular Material's default strategy. */
@Injectable()
export class PbRangeSelectionStrategyAdapter implements MatDateRangeSelectionStrategy<Date> {
  private readonly picker = inject(forwardRef(() => PbDateRangePicker));
  private readonly fallback = new DefaultMatCalendarRangeStrategy<Date>(inject(DateAdapter));

  selectionFinished(date: Date | null, currentRange: DateRange<Date>): DateRange<Date> {
    const strategy = this.picker.selectionStrategy();
    if (!date) return currentRange;
    if (!strategy) return this.fallback.selectionFinished(date, currentRange);
    const range = strategy(date);
    return new DateRange(range.start, range.end);
  }

  createPreview(activeDate: Date | null, currentRange: DateRange<Date>): DateRange<Date> {
    const strategy = this.picker.selectionStrategy();
    if (!strategy) return this.fallback.createPreview(activeDate, currentRange);
    if (!activeDate) return new DateRange<Date>(null, null);
    const range = strategy(activeDate);
    return new DateRange(range.start, range.end);
  }
}

/**
 * Material 3 date range picker (PBDateRangePicker): start and end inputs in one field and a calendar that
 * picks the start, previews the range under the pointer and closes when the end is picked. Bind
 * [(start)]/[(end)], or use it as a form control whose value is { start, end }. Supports comparison ranges,
 * a custom selection strategy, action buttons, touch UI, placeholders and a clear button, formats,
 * available dates and highlighted days.
 */
@Component({
  selector: 'pb-date-range-picker',
  imports: [
    MatFormField,
    MatLabel,
    MatDateRangeInput,
    MatStartDate,
    MatEndDate,
    MatDateRangePicker,
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
  ],
  providers: [
    { provide: DateAdapter, useClass: PbDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: PB_DATE_FORMATS },
    { provide: MAT_DATE_RANGE_SELECTION_STRATEGY, useClass: PbRangeSelectionStrategyAdapter },
    providePbValueAccessor(() => PbDateRangePicker),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './datepicker.css',
  // The Persian calendar uses the Foundation font (--font-family-mainfont), in its popup too.
  host: { '[class.pb-field--block]': 'block()', '[class.pb-font-mainfont]': 'persian()' },
  template: `
    <mat-form-field [appearance]="appearance()">
      @if (label(); as text) {
        <mat-label>{{ text }}</mat-label>
      }
      <mat-date-range-input
        [rangePicker]="picker"
        [min]="min()"
        [max]="max()"
        [dateFilter]="filter()"
        [required]="required()"
        [disabled]="isDisabled()"
        [comparisonStart]="comparisonStart()"
        [comparisonEnd]="comparisonEnd()"
      >
        <input
          matStartDate
          autocomplete="off"
          [placeholder]="startNullText() ?? nullText() ?? ''"
          [errorStateMatcher]="errorStateMatcher"
          [value]="start()"
          (dateChange)="onStart($event.value)"
          (blur)="onTouched()"
        />
        <input
          matEndDate
          autocomplete="off"
          [placeholder]="endNullText() ?? ''"
          [errorStateMatcher]="errorStateMatcher"
          [value]="end()"
          (dateChange)="onEnd($event.value)"
          (blur)="onTouched()"
        />
      </mat-date-range-input>
      @if (clearButtonDisplayMode() === 'auto' && (start() || end()) && !isDisabled()) {
        <button matIconButton matSuffix type="button" class="pb-date-edit__clear" aria-label="Clear" (click)="clear()">
          <span class="pb-icons" aria-hidden="true">x-close</span>
        </button>
      }
      <mat-datepicker-toggle matSuffix [for]="picker">
        @if (toggleIcon(); as icon) {
          <span class="material-icons" matDatepickerToggleIcon>{{ icon }}</span>
        }
      </mat-datepicker-toggle>
      <mat-date-range-picker
        #picker
        [panelClass]="persian() ? ['pb-layer--menu', 'pb-font-mainfont'] : 'pb-layer--menu'"
        [dateClass]="cellClass()"
        [touchUi]="touchUi()"
        [startAt]="startAt()"
        [startView]="startView() === 'decade' ? 'multi-year' : startView() === 'year' ? 'year' : 'month'"
        [calendarHeaderComponent]="$any(calendarHeader())"
      >
        @if (showActionButtons()) {
          <mat-date-range-picker-actions>
            <button matButton type="button" matDateRangePickerCancel>Cancel</button>
            <button matButton type="button" matDateRangePickerApply>Apply</button>
          </mat-date-range-picker-actions>
        }
      </mat-date-range-picker>
      @if (errorText(); as text) {
        <mat-error>{{ text }}</mat-error>
      } @else if (supportingText(); as text) {
        <mat-hint>{{ text }}</mat-hint>
      }
    </mat-form-field>
  `,
})
export class PbDateRangePicker implements ControlValueAccessor {
  readonly start = model<Date | null>(null);
  readonly end = model<Date | null>(null);
  readonly label = input<string>();
  readonly supportingText = input<string>();
  /** Shown in place of the supporting text, and puts the field in its error state, while set. */
  readonly errorText = input<string>();
  readonly appearance = input<PbFormFieldAppearance>('fill');
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly block = input(false, { transform: booleanAttribute });
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly customDisabledDate = input<((date: Date) => boolean) | null>(null);
  readonly dayCellClass = input<MatCalendarCellClassFunction<Date> | null>(null);
  readonly nullText = input<string>();
  readonly startNullText = input<string>();
  readonly endNullText = input<string>();
  readonly clearButtonDisplayMode = input<PbClearButtonDisplayMode>('never');
  readonly displayFormat = input<string>();
  readonly format = input<string>();
  readonly locale = input<string>();
  /** 'persian' shows and edits Persian (Jalali, Shamsi) dates (see pb-datepicker). */
  readonly calendarSystem = input<PbCalendarSystem>();
  readonly firstDayOfWeek = input<number | null>(null);
  /** A second range drawn for comparison (e.g. the previous period). */
  readonly comparisonStart = input<Date | null>(null);
  readonly comparisonEnd = input<Date | null>(null);
  /** Turns one click into a whole range (and previews it under the pointer). */
  readonly selectionStrategy = input<PbRangeSelectionStrategy | null>(null);
  /** Cancel/Apply buttons: picking only stages the range until Apply. */
  readonly showActionButtons = input(false, { transform: booleanAttribute });
  readonly touchUi = input(false, { transform: booleanAttribute });
  readonly toggleIcon = input<string>();
  readonly startAt = input<Date | null>(null);
  readonly startView = input<PbCalendarViewMode | null>(null);
  readonly calendarHeader = input<Type<unknown> | null>(null);

  private readonly adapter = inject(DateAdapter) as PbDateAdapter;
  private readonly defaultLocale = String(inject(MAT_DATE_LOCALE, { optional: true }) ?? 'en-US');
  private readonly startInput = viewChild(MatStartDate);
  private readonly endInput = viewChild(MatEndDate);
  private readonly formDisabled = signal(false);
  private onChange: (value: PbDateRange) => void = () => {};
  protected onTouched: () => void = () => {};

  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  protected readonly persian = computed(() => calendarOfLocale(calendarLocale(this.locale() ?? this.defaultLocale, this.calendarSystem())) === 'persian');
  protected readonly filter = computed(() => {
    const custom = this.customDisabledDate();
    return (date: Date | null) => !date || !custom?.(date);
  });
  protected readonly cellClass = computed<MatCalendarCellClassFunction<Date>>(() => this.dayCellClass() ?? (() => ''));
  protected readonly errorStateMatcher: ErrorStateMatcher = { isErrorState: () => !!this.errorText() };

  constructor() {
    // Keeps this overlay in the Figma Layering order in the top layer.
    inject(PbLayerOrder);
    effect(() => {
      const edit = this.format() ?? 'd';
      const display = this.displayFormat() ?? edit;
      const firstDay = this.firstDayOfWeek();
      const locale = calendarLocale(this.locale() ?? this.defaultLocale, this.calendarSystem());
      untracked(() => {
        this.adapter.editFormat = edit;
        this.adapter.displayFormat = display;
        this.adapter.firstDay = firstDay;
        this.adapter.setLocale(locale);
      });
    });
    // The range inputs have no NgControl, so they never re-check their error state on their own.
    afterRenderEffect(() => {
      this.errorText();
      this.startInput()?.updateErrorState();
      this.endInput()?.updateErrorState();
    });
  }

  writeValue(value: PbDateRange | null): void {
    this.start.set(value?.start ?? null);
    this.end.set(value?.end ?? null);
  }

  registerOnChange(fn: (value: PbDateRange) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  protected onStart(date: Date | null): void {
    this.start.set(date);
    this.onChange({ start: date, end: this.end() });
  }

  protected onEnd(date: Date | null): void {
    this.end.set(date);
    this.onChange({ start: this.start(), end: date });
  }

  clear(): void {
    this.start.set(null);
    this.end.set(null);
    this.onChange({ start: null, end: null });
  }
}

/**
 * The datepicker's calendar on its own (PBCalendar, mat-calendar inline): bind [(selected)], or a range
 * with [(start)]/[(end)] and rangeSelection.
 */
@Component({
  selector: 'pb-calendar',
  imports: [MatCalendar],
  providers: [
    { provide: DateAdapter, useClass: PbDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: PB_DATE_FORMATS },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pb-calendar-card', '[class.pb-font-mainfont]': 'persian()' },
  template: `
    <mat-calendar
      [selected]="selection()"
      [minDate]="min()"
      [maxDate]="max()"
      [dateFilter]="filter()"
      [dateClass]="cellClass()"
      [startView]="startView()"
      [startAt]="selected() ?? start()"
      (selectedChange)="onSelected($event)"
      (monthSelected)="onMonth($event)"
      (yearSelected)="onYear($event)"
    />
  `,
  styles: `
    :host {
      display: block;
      width: 296px;
      max-width: 100%;
      overflow: hidden;
      border-radius: var(--mat-sys-corner-large);
      background-color: var(--mat-sys-surface-container-high);
    }
  `,
})
export class PbCalendar {
  readonly selected = model<Date | null>(null);
  readonly rangeSelection = input(false, { transform: booleanAttribute });
  readonly start = model<Date | null>(null);
  readonly end = model<Date | null>(null);
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly customDisabledDate = input<((date: Date) => boolean) | null>(null);
  readonly dayCellClass = input<MatCalendarCellClassFunction<Date> | null>(null);
  readonly viewMode = input<PbCalendarViewMode>('month');
  readonly locale = input<string>();
  /** 'persian' shows Persian (Jalali, Shamsi) months and days. */
  readonly calendarSystem = input<PbCalendarSystem>();
  /** 0 = Sunday … 6 = Saturday. */
  readonly firstDayOfWeek = input<number | null>(null);

  private readonly adapter = inject(DateAdapter) as PbDateAdapter;
  private readonly defaultLocale = String(inject(MAT_DATE_LOCALE, { optional: true }) ?? 'en-US');
  protected readonly persian = computed(() => calendarOfLocale(calendarLocale(this.locale() ?? this.defaultLocale, this.calendarSystem())) === 'persian');

  constructor() {
    effect(() => {
      const firstDay = this.firstDayOfWeek();
      const locale = calendarLocale(this.locale() ?? this.defaultLocale, this.calendarSystem());
      untracked(() => {
        this.adapter.firstDay = firstDay;
        this.adapter.setLocale(locale);
      });
    });
  }

  protected readonly selection = computed<Date | DateRange<Date> | null>(() => (this.rangeSelection() ? new DateRange(this.start(), this.end()) : this.selected()));
  protected readonly filter = computed(() => {
    const custom = this.customDisabledDate();
    return (date: Date | null) => !date || !custom?.(date);
  });
  protected readonly cellClass = computed<MatCalendarCellClassFunction<Date>>(() => this.dayCellClass() ?? (() => ''));
  protected readonly startView = computed(() => (this.viewMode() === 'year' ? 'year' : this.viewMode() === 'decade' ? 'multi-year' : 'month'));

  protected onSelected(date: Date | null): void {
    if (!date) return;
    if (!this.rangeSelection()) {
      this.selected.set(date);
      return;
    }
    const start = this.start();
    if (!start || this.end() || date < start) {
      this.start.set(date);
      this.end.set(null);
    } else this.end.set(date);
  }

  protected onMonth(date: Date): void {
    if (this.viewMode() === 'year') this.selected.set(this.adapter.createDate(this.adapter.getYear(date), this.adapter.getMonth(date), 1));
  }

  protected onYear(date: Date): void {
    if (this.viewMode() === 'decade') this.selected.set(this.adapter.createDate(this.adapter.getYear(date), 0, 1));
  }
}
