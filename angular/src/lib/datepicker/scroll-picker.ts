import { afterEveryRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, model, ViewEncapsulation } from '@angular/core';
import { localeNames } from './date-format';
import { calendarDateOf, calendarToDate, daysInCalendarMonth } from './jalali';

interface ScrollItem {
  value: number;
  text: string;
  disabled: boolean;
}

interface ScrollColumn {
  kind: string;
  label: string;
  items: ScrollItem[];
  selected: number;
}

let scrollPickerId = 0;

/**
 * Wheel columns that snap to the item in the middle band (the datepicker's adaptive view). Columns and
 * their order come from the format: "ddd" = "15 Fri", "dddd" = "15 Friday", "MMM" = "Oct",
 * "MMMM" = "October", "yyyy" = 2026, and time parts "HH", "hh", "mm", "ss", "tt". A locale with
 * "-u-ca-persian" shows Persian (Jalali) days, months and years.
 */
@Component({
  selector: 'pb-scroll-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'pb-scroll-picker', role: 'group', '[attr.aria-label]': 'label()' },
  template: `
    @for (column of columns(); track column.kind; let c = $index) {
      <div
        class="pb-scroll-picker__column"
        role="listbox"
        tabindex="0"
        [attr.aria-label]="column.label"
        [attr.data-column]="c"
        [attr.aria-activedescendant]="id + '-' + c + '-' + column.selected"
        (keydown)="onKeyDown(c, $event)"
        (scroll)="onScroll(c, $event)"
      >
        <div class="pb-scroll-picker__spacer" aria-hidden="true"></div>
        @for (item of column.items; track item.value; let i = $index) {
          <div
            role="option"
            class="pb-scroll-picker__item"
            [id]="id + '-' + c + '-' + i"
            [class.pb-scroll-picker__item--selected]="i === column.selected"
            [class.pb-scroll-picker__item--disabled]="item.disabled"
            [attr.aria-selected]="i === column.selected"
            [attr.aria-disabled]="item.disabled || null"
            (click)="select(c, i, true)"
          >{{ item.text }}</div>
        }
        <div class="pb-scroll-picker__spacer" aria-hidden="true"></div>
      </div>
    }
    <div class="pb-scroll-picker__band" aria-hidden="true"></div>
  `,
})
export class PbScrollPicker {
  readonly value = model<Date>(new Date());
  readonly format = input('d MMMM yyyy');
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly isAllowed = input<(date: Date) => boolean>(() => true);
  readonly locale = input('en-US');
  readonly label = input('Date');

  protected readonly id = `pb-scroll-${++scrollPickerId}`;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private syncingUntil = 0;
  private smoothNext = false;

  constructor() {
    afterEveryRender(() => this.sync());
    inject(DestroyRef).onDestroy(() => this.timers.forEach((t) => clearTimeout(t)));
  }

  private allowed(date: Date): boolean {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const min = this.min();
    const max = this.max();
    if (min && day < new Date(min.getFullYear(), min.getMonth(), min.getDate())) return false;
    if (max && day > new Date(max.getFullYear(), max.getMonth(), max.getDate())) return false;
    return this.isAllowed()(date);
  }

  protected readonly columns = computed<ScrollColumn[]>(() => {
    const value = this.value();
    const names = localeNames(this.locale());
    const calendar = names.calendar;
    const current = calendarDateOf(value, calendar);
    const columns: ScrollColumn[] = [];
    for (const token of this.format().split(' ').filter(Boolean)) {
      const c = token[0];
      const length = token.length;
      switch (c) {
        case 'd': {
          const days = daysInCalendarMonth(current.year, current.month, calendar);
          columns.push({
            kind: 'day',
            label: 'Day',
            items: Array.from({ length: days }, (_, i) => {
              const date = calendarToDate(current.year, current.month, i + 1, calendar);
              const text = length === 3 ? `${i + 1} ${names.daysShort[date.getDay()]}` : length >= 4 ? `${i + 1} ${names.days[date.getDay()]}` : String(i + 1);
              return { value: i + 1, text, disabled: !this.allowed(date) };
            }),
            selected: current.day - 1,
          });
          break;
        }
        case 'M':
          columns.push({
            kind: 'month',
            label: 'Month',
            items: Array.from({ length: 12 }, (_, m) => {
              const first = calendarToDate(current.year, m + 1, 1, calendar);
              const last = calendarToDate(current.year, m + 1, daysInCalendarMonth(current.year, m + 1, calendar), calendar);
              const min = this.min();
              const max = this.max();
              return { value: m, text: (length === 3 ? names.monthsShort : names.months)[m], disabled: (!!min && last < min) || (!!max && first > max) };
            }),
            selected: current.month - 1,
          });
          break;
        case 'y': {
          const min = this.min();
          const max = this.max();
          const from = min ? calendarDateOf(min, calendar).year : current.year - 100;
          const to = max ? calendarDateOf(max, calendar).year : current.year + 100;
          columns.push({
            kind: 'year',
            label: 'Year',
            items: Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, text: String(from + i), disabled: false })),
            selected: current.year - from,
          });
          break;
        }
        case 'H':
        case 'h': {
          const twelve = c === 'h';
          columns.push({
            kind: twelve ? 'hour12' : 'hour24',
            label: 'Hour',
            items: Array.from({ length: twelve ? 12 : 24 }, (_, i) => {
              const h = twelve ? i + 1 : i;
              return { value: h, text: length === 2 ? String(h).padStart(2, '0') : String(h), disabled: false };
            }),
            selected: twelve ? (value.getHours() % 12 || 12) - 1 : value.getHours(),
          });
          break;
        }
        case 'm':
        case 's':
          columns.push({
            kind: c === 'm' ? 'minute' : 'second',
            label: c === 'm' ? 'Minute' : 'Second',
            items: Array.from({ length: 60 }, (_, i) => ({ value: i, text: String(i).padStart(2, '0'), disabled: false })),
            selected: c === 'm' ? value.getMinutes() : value.getSeconds(),
          });
          break;
        case 't':
          columns.push({
            kind: 'ampm',
            label: 'AM/PM',
            items: [
              { value: 0, text: names.am, disabled: false },
              { value: 1, text: names.pm, disabled: false },
            ],
            selected: value.getHours() >= 12 ? 1 : 0,
          });
          break;
      }
    }
    return columns;
  });

  private withValue(kind: string, n: number): Date {
    const v = this.value();
    let d = new Date(v);
    const calendar = localeNames(this.locale()).calendar;
    const { year, month, day } = calendarDateOf(v, calendar);
    const at = (y: number, m: number) => calendarToDate(y, m, Math.min(day, daysInCalendarMonth(y, m, calendar)), calendar, v.getHours(), v.getMinutes(), v.getSeconds());
    switch (kind) {
      case 'day':
        d = calendarToDate(year, month, n, calendar, v.getHours(), v.getMinutes(), v.getSeconds());
        break;
      case 'month':
        d = at(year, n + 1);
        break;
      case 'year':
        d = at(n, month);
        break;
      case 'hour24':
        d.setHours(n);
        break;
      case 'hour12':
        d.setHours((n % 12) + (v.getHours() >= 12 ? 12 : 0));
        break;
      case 'minute':
        d.setMinutes(n);
        break;
      case 'second':
        d.setSeconds(n);
        break;
      default:
        d.setHours((v.getHours() % 12) + (n ? 12 : 0));
    }
    const min = this.min();
    const max = this.max();
    if (min && d < min) return new Date(min);
    if (max && d > max) return new Date(max);
    return d;
  }

  protected select(columnIndex: number, index: number, smooth: boolean): void {
    const column = this.columns()[columnIndex];
    const item = column?.items[index];
    if (!item) return;
    const next = this.withValue(column.kind, item.value);
    if (column.kind === 'day' && !this.allowed(next)) return;
    this.smoothNext = smooth;
    this.value.set(next);
  }

  protected onKeyDown(columnIndex: number, e: KeyboardEvent): void {
    const column = this.columns()[columnIndex];
    const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : e.key === 'PageUp' ? -5 : e.key === 'PageDown' ? 5 : e.key === 'Home' ? -column.selected : e.key === 'End' ? column.items.length - 1 - column.selected : 0;
    if (!delta) return;
    e.preventDefault();
    this.select(columnIndex, Math.max(0, Math.min(column.items.length - 1, column.selected + delta)), true);
  }

  protected onScroll(columnIndex: number, e: Event): void {
    if (Date.now() < this.syncingUntil) return;
    const element = e.target as HTMLElement;
    clearTimeout(this.timers.get(columnIndex));
    this.timers.set(
      columnIndex,
      setTimeout(() => {
        const height = (element.querySelector('.pb-scroll-picker__item') as HTMLElement | null)?.offsetHeight || 40;
        const index = Math.round(element.scrollTop / height);
        if (index !== this.columns()[columnIndex]?.selected) this.select(columnIndex, index, false);
      }, 120),
    );
  }

  /** Scrolls every column so its selected item sits in the middle band. */
  private sync(): void {
    const smooth = this.smoothNext;
    this.smoothNext = false;
    this.host.querySelectorAll<HTMLElement>('.pb-scroll-picker__column').forEach((column) => {
      const items = [...column.querySelectorAll<HTMLElement>('.pb-scroll-picker__item')];
      const index = items.findIndex((item) => item.classList.contains('pb-scroll-picker__item--selected'));
      if (index < 0) return;
      const top = index * (items[0]?.offsetHeight || 40);
      if (Math.abs(column.scrollTop - top) <= 1) return;
      this.syncingUntil = Date.now() + (smooth ? 400 : 80);
      column.scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' });
    });
  }
}
