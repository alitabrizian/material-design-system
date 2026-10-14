import { DateParts, DateSection, fromParts, LocaleNames, sectionText, toParts } from './date-format';
import { daysInCalendarMonth, PbCalendarSystem } from './jalali';

export interface DateMaskOptions {
  sections: DateSection[];
  names: LocaleNames;
  /** Advancing: the caret moves to the next section once one is complete. */
  caretMode: 'regular' | 'advancing';
  /** Up/Down past a section's limit also changes the next unit (Dec 31 + 1 day = Jan 1 of the next year). */
  cascade: boolean;
  readOnly: boolean;
}

const EDITABLE = new Set(['day', 'month', 'monthName', 'year', 'hour24', 'hour12', 'minute', 'second', 'ampm', 'offset']);

/**
 * The date-time mask engine (the same rules as the Blazor PBDatepicker's): the caret selects one section;
 * digits and letters type into it, Up/Down and the mouse wheel change it, Left/Right/Tab move between
 * sections, and Backspace resets it (all of it selected: clears the value).
 */
export class DateMask {
  private parts: DateParts | null = null;
  private active = 0;
  private buffer = '';
  private editable: { section: DateSection; start: number; end: number }[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private sent = '';
  private readonly listeners: [string, EventListener, AddEventListenerOptions?][];

  constructor(
    private readonly input: HTMLInputElement,
    private options: DateMaskOptions,
    private readonly changed: (value: Date | null) => void,
  ) {
    this.listeners = [
      ['focus', () => {
        this.buffer = '';
        setTimeout(() => this.render(), 0);
      }],
      ['blur', () => {
        this.buffer = '';
        this.render(false);
        this.notify(true);
      }],
      ['mouseup', () => {
        if (document.activeElement !== this.input) return;
        this.active = this.sectionAt(this.input.selectionStart ?? 0);
        this.buffer = '';
        this.render();
      }],
      ['keydown', (e) => this.onKeyDown(e as KeyboardEvent)],
      ['wheel', (e) => this.onWheel(e as WheelEvent), { passive: false }],
      ['input', () => this.render()],
      ['paste', (e) => e.preventDefault()],
    ];
    for (const [name, handler, opts] of this.listeners) input.addEventListener(name, handler, opts);
  }

  private get withOffset(): boolean {
    return this.options.sections.some((s) => s.kind === 'offset');
  }

  /** The year/month/day fields are this calendar's (the names' calendar). */
  private get calendar(): PbCalendarSystem {
    return this.options.names.calendar;
  }

  private daysIn(year: number, month: number): number {
    return daysInCalendarMonth(year, month, this.calendar);
  }

  /** Shows a value (null: empty) and the options it is edited with. */
  update(value: Date | null, options: DateMaskOptions): void {
    this.options = options;
    const offset = this.parts?.offset;
    this.parts = value ? toParts(value, this.withOffset ? (offset ?? -value.getTimezoneOffset()) : undefined, this.calendar) : null;
    this.sent = this.key();
    this.buffer = '';
    this.render(document.activeElement === this.input);
  }

  destroy(): void {
    clearTimeout(this.timer);
    for (const [name, handler] of this.listeners) this.input.removeEventListener(name, handler);
  }

  private key(): string {
    return this.parts ? JSON.stringify(this.parts) : 'null';
  }

  private today(): DateParts {
    const now = new Date();
    return { ...toParts(new Date(now.getFullYear(), now.getMonth(), now.getDate()), undefined, this.calendar), offset: -now.getTimezoneOffset() };
  }

  private layout(): string {
    let text = '';
    this.editable = [];
    for (const section of this.options.sections) {
      const value = this.parts ? sectionText(section, this.parts, this.options.names) : section.kind === 'literal' ? (section.text ?? '') : placeholder(section);
      if (EDITABLE.has(section.kind)) this.editable.push({ section, start: text.length, end: text.length + value.length });
      text += value;
    }
    return text;
  }

  private render(select = true): void {
    const text = this.layout();
    this.input.value = !this.parts && document.activeElement !== this.input ? '' : text;
    if (select && document.activeElement === this.input && this.editable.length) {
      const active = this.editable[Math.min(this.active, this.editable.length - 1)];
      try {
        this.input.setSelectionRange(active.start, active.end);
      } catch {
        /* not focusable */
      }
    }
  }

  private notify(immediate = false): void {
    clearTimeout(this.timer);
    const send = () => {
      const key = this.key();
      if (key === this.sent) return;
      this.sent = key;
      this.changed(this.parts ? fromParts(this.parts, this.withOffset, this.calendar) : null);
    };
    if (immediate) send();
    else this.timer = setTimeout(send, 300);
  }

  private sectionAt(position: number): number {
    let best = 0;
    this.editable.forEach((entry, i) => {
      if (position >= entry.start) best = i;
    });
    return best;
  }

  private move(delta: number): boolean {
    const next = this.active + delta;
    if (next < 0 || next >= this.editable.length) return false;
    this.active = next;
    this.buffer = '';
    this.render();
    return true;
  }

  private limits(kind: string): [number, number] {
    const p = this.parts!;
    switch (kind) {
      case 'day':
        return [1, this.daysIn(p.year, p.month)];
      case 'month':
      case 'monthName':
        return [1, 12];
      case 'year':
        return [1, 9999];
      case 'hour24':
        return [0, 23];
      case 'hour12':
        return [1, 12];
      case 'minute':
      case 'second':
        return [0, 59];
      case 'offset':
        return [-840, 840];
      default:
        return [0, 1];
    }
  }

  private field(kind: string): number {
    const p = this.parts!;
    switch (kind) {
      case 'day':
        return p.day;
      case 'month':
      case 'monthName':
        return p.month;
      case 'year':
        return p.year;
      case 'hour24':
        return p.hour;
      case 'hour12':
        return p.hour % 12 || 12;
      case 'minute':
        return p.minute;
      case 'second':
        return p.second;
      case 'ampm':
        return p.hour >= 12 ? 1 : 0;
      default:
        return p.offset;
    }
  }

  private set(kind: string, value: number): void {
    const p = { ...this.parts! };
    switch (kind) {
      case 'day':
        p.day = value;
        break;
      case 'month':
      case 'monthName':
        p.month = value;
        break;
      case 'year':
        p.year = value;
        break;
      case 'hour24':
        p.hour = value;
        break;
      case 'hour12':
        p.hour = (value % 12) + (p.hour >= 12 ? 12 : 0);
        break;
      case 'minute':
        p.minute = value;
        break;
      case 'second':
        p.second = value;
        break;
      case 'ampm':
        p.hour = (p.hour % 12) + (value ? 12 : 0);
        break;
      case 'offset':
        p.offset = value;
        break;
    }
    p.day = Math.min(p.day, this.daysIn(p.year, p.month));
    this.parts = p;
  }

  private step(kind: string, delta: number): void {
    const p = this.parts!;
    const calendar = this.calendar;
    if (kind === 'offset') return this.set(kind, Math.max(-840, Math.min(840, p.offset + delta * 60)));
    if (kind === 'ampm') return this.set(kind, this.field(kind) ? 0 : 1);
    if (this.options.cascade && calendar !== 'gregorian' && (kind === 'month' || kind === 'monthName' || kind === 'year')) {
      // Month arithmetic in the calendar's own months; the day is clamped to the new month.
      const index = p.year * 12 + p.month - 1 + (kind === 'year' ? delta * 12 : delta);
      const year = Math.floor(index / 12);
      const month = index - year * 12 + 1;
      this.parts = { ...p, year, month, day: Math.min(p.day, this.daysIn(year, month)) };
      return;
    }
    if (this.options.cascade) {
      const date = calendar === 'gregorian' ? new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) : fromParts({ ...p }, false, calendar);
      switch (kind) {
        case 'day':
          date.setDate(date.getDate() + delta);
          break;
        case 'month':
        case 'monthName': {
          const day = date.getDate();
          date.setDate(1);
          date.setMonth(date.getMonth() + delta);
          date.setDate(Math.min(day, daysInCalendarMonth(date.getFullYear(), date.getMonth() + 1, 'gregorian')));
          break;
        }
        case 'year':
          date.setFullYear(date.getFullYear() + delta);
          break;
        case 'hour24':
        case 'hour12':
          date.setHours(date.getHours() + delta);
          break;
        case 'minute':
          date.setMinutes(date.getMinutes() + delta);
          break;
        case 'second':
          date.setSeconds(date.getSeconds() + delta);
          break;
      }
      this.parts = { ...toParts(date, undefined, calendar), offset: p.offset };
      return;
    }
    const [min, max] = this.limits(kind);
    let value = this.field(kind) + delta;
    if (value > max) value = min;
    if (value < min) value = max;
    this.set(kind, value);
  }

  private typeDigit(digit: string): void {
    const entry = this.editable[this.active];
    if (!entry) return;
    const kind = entry.section.kind;
    if (!this.parts) this.parts = this.today();
    if (kind === 'ampm' || kind === 'offset') return;
    const maxDigits = kind === 'year' ? (entry.section.length <= 2 ? 2 : 4) : 2;
    let buffer = this.buffer + digit;
    let value = Number(buffer);
    if (kind === 'year' && entry.section.length <= 2) value = (this.calendar === 'persian' ? 1400 : 2000) + value;
    const [min, max] = this.limits(kind);
    if (kind !== 'year' && value > max) {
      buffer = digit;
      value = Number(digit);
    }
    this.buffer = buffer;
    if (kind === 'year') this.set(kind, Math.max(1, value));
    else if (value >= min || buffer.length < maxDigits) this.set(kind, Math.max(min, Math.min(max, value)));
    const complete = buffer.length >= maxDigits || (kind !== 'year' && value * 10 > max);
    this.render();
    this.notify();
    if (complete) {
      this.buffer = '';
      if (this.options.caretMode === 'advancing') this.move(1);
    }
  }

  private typeLetter(letter: string): void {
    const entry = this.editable[this.active];
    if (!entry) return;
    const kind = entry.section.kind;
    const names = this.options.names;
    if (!this.parts) this.parts = this.today();
    if (kind === 'ampm') {
      const l = letter.toLowerCase();
      if (names.am.toLowerCase().startsWith(l)) this.set(kind, 0);
      else if (names.pm.toLowerCase().startsWith(l)) this.set(kind, 1);
      else return;
    } else if (kind === 'monthName') {
      this.buffer += letter.toLowerCase();
      const list = entry.section.length === 3 ? names.monthsShort : names.months;
      let index = list.findIndex((n) => n.toLowerCase().startsWith(this.buffer));
      if (index < 0) {
        this.buffer = letter.toLowerCase();
        index = list.findIndex((n) => n.toLowerCase().startsWith(this.buffer));
      }
      if (index < 0) return;
      this.set(kind, index + 1);
    } else return;
    this.render();
    this.notify();
    if (kind === 'ampm' && this.options.caretMode === 'advancing') this.move(1);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.options.readOnly || (e.ctrlKey && e.key.toLowerCase() !== 'a') || e.metaKey || e.altKey) return;
    const entry = this.editable[this.active];
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        e.preventDefault();
        if (!entry) return;
        if (!this.parts) this.parts = this.today();
        else this.step(entry.section.kind, e.key === 'ArrowUp' ? 1 : -1);
        this.buffer = '';
        this.render();
        this.notify();
        return;
      case 'ArrowLeft':
        e.preventDefault();
        this.move(-1);
        return;
      case 'ArrowRight':
        e.preventDefault();
        this.move(1);
        return;
      case 'Home':
        e.preventDefault();
        this.move(-this.active);
        return;
      case 'End':
        e.preventDefault();
        this.move(this.editable.length - 1 - this.active);
        return;
      case 'Tab':
        if (this.move(e.shiftKey ? -1 : 1)) e.preventDefault();
        return;
      case 'Backspace':
      case 'Delete': {
        e.preventDefault();
        const all = this.input.selectionStart === 0 && this.input.selectionEnd === this.input.value.length && this.editable.length > 1;
        if (all || !this.parts) {
          this.parts = null;
          this.active = 0;
        } else if (entry && entry.section.kind !== 'ampm' && entry.section.kind !== 'offset' && entry.section.kind !== 'year') {
          this.set(entry.section.kind, this.limits(entry.section.kind)[0]);
        }
        this.buffer = '';
        this.render();
        this.notify();
        return;
      }
      case 'Enter':
        this.notify(true);
        return;
    }
    if (e.ctrlKey) return;
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      this.typeDigit(e.key);
    } else if ((e.key === '+' || e.key === '-') && entry?.section.kind === 'offset') {
      e.preventDefault();
      if (this.parts) {
        this.set('offset', (e.key === '-' ? -1 : 1) * Math.abs(this.parts.offset));
        this.render();
        this.notify();
      }
    } else if (e.key.length === 1) {
      e.preventDefault();
      if (/\p{L}/u.test(e.key)) this.typeLetter(e.key);
      else this.move(1); // a typed separator moves on
    }
  }

  private onWheel(e: WheelEvent): void {
    if (document.activeElement !== this.input || this.options.readOnly) return;
    e.preventDefault();
    const entry = this.editable[this.active];
    if (!entry) return;
    if (!this.parts) this.parts = this.today();
    else this.step(entry.section.kind, e.deltaY < 0 ? 1 : -1);
    this.render();
    this.notify();
  }
}

function placeholder(section: DateSection): string {
  switch (section.kind) {
    case 'day':
      return 'dd';
    case 'month':
      return 'mm';
    case 'monthName':
      return section.length === 3 ? 'mmm' : 'month';
    case 'year':
      return section.length <= 2 ? 'yy' : 'yyyy';
    case 'hour24':
    case 'hour12':
      return 'hh';
    case 'minute':
      return 'mm';
    case 'second':
      return 'ss';
    case 'fraction':
      return 'f'.repeat(section.length);
    case 'ampm':
      return '--';
    case 'weekday':
      return '---';
    case 'offset':
      return '+00:00';
    default:
      return '';
  }
}
