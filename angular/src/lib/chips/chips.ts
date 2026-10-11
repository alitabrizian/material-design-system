import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import {
  MatChip,
  MatChipAvatar,
  MatChipEdit,
  MatChipGrid,
  MatChipInput,
  MatChipListbox,
  MatChipOption,
  MatChipRemove,
  MatChipRow,
  MatChipSet,
} from '@angular/material/chips';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { PbFieldBase, providePbValueAccessor } from '../core/value-accessor';
import { PbClearButtonDisplayMode } from '../datepicker/datepicker';
import { PbChip } from './chip';
import {
  PbChipsCellContext,
  PbChipsColumn,
  PbChipsEmptyTemplate,
  PbChipsGroupHeaderTemplate,
  PbChipsHighlight,
  PbChipsItemContext,
  PbChipsItemTemplate,
  PbChipsReorderEvent,
  PbChipsSearchMode,
  PbChipsTagContext,
  PbChipsTagTemplate,
  PbDropDownWidthMode,
  PbHighlightSegment,
  PbListRenderMode,
  PbSearchFilterCondition,
  PbSearchTextParseMode,
} from './chips-templates';

interface Tag<T, V> {
  key: number;
  item?: T;
  hasItem: boolean;
  isCustom: boolean;
  text: string;
  value?: V;
}

interface Row<T> {
  kind: 'group' | 'item';
  item?: T;
  group?: string;
  visibleIndex: number;
  selected: boolean;
  disabled: boolean;
  index: number;
}

let nextId = 0;

const same = <X>(a: readonly X[] | null | undefined, b: readonly X[] | null | undefined) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]));

/**
 * Material 3 chips (PBChips). With pb-chip children it is a chip set (mat-chip-set / mat-chip-listbox):
 * assist, filter and input chips, optionally stacked or reorderable by drag and drop.
 * With `data` or `allowCustomTags` it is a tag box (mat-chip-grid with an input, DevExpress TagBox): the
 * selected items and custom tags as chips, a search box and a dropdown list with search highlighting,
 * columns, groups, disabled items, virtual scrolling and templates. As a form control its value is `values`.
 */
@Component({
  selector: 'pb-chips',
  imports: [
    MatChipSet,
    MatChipListbox,
    MatChip,
    MatChipOption,
    MatChipAvatar,
    MatChipRemove,
    MatChipGrid,
    MatChipRow,
    MatChipInput,
    MatChipEdit,
    MatIcon,
    MatIconButton,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatSuffix,
    CdkConnectedOverlay,
    CdkDropList,
    CdkDrag,
    NgTemplateOutlet,
    PbChipsHighlight,
  ],
  providers: [providePbValueAccessor(() => PbChips)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'pb-chips-host', '[class.pb-chips-host--tag-box]': 'tagBox()' },
  templateUrl: './chips.html',
  styleUrl: './chips.css',
})
export class PbChips<T = string, V = T> extends PbFieldBase<V[] | null | undefined> {
  // ---------------------------------------------------------------- chip set

  /** Chip set: a listbox of selectable filter chips (mat-chip-listbox). */
  readonly selectable = input(false, { transform: booleanAttribute });
  readonly multiple = input(true, { transform: booleanAttribute });
  /** One chip per row, full width (mat-chip-set-stacked). */
  readonly stacked = input(false, { transform: booleanAttribute });
  /** Chips can be reordered by drag and drop; the tag box reorders its tags itself. */
  readonly reorderable = input(false, { transform: booleanAttribute });
  /** Chip set: a chip was dropped at a new index; reorder your list. */
  readonly reordered = output<PbChipsReorderEvent>();

  // ---------------------------------------------------------------- tag box data

  /** The items listed in the dropdown (setting it makes this a tag box). */
  readonly data = input<readonly T[]>();
  /** Loads the items asynchronously (the list shows the empty data area while loading). */
  readonly dataAsync = input<() => Promise<readonly T[]>>();
  /** The item property that supplies item and tag text (default: the item itself). */
  readonly textFieldName = input<string>();
  /** The item property that supplies values (default: a `value` property, or the item itself). */
  readonly valueFieldName = input<string>();
  readonly groupFieldName = input<string>();
  /** A boolean item property: true disables the item. */
  readonly disabledFieldName = input<string>();
  /** Tag text built from the visible columns, e.g. `{0} {1}`. */
  readonly editFormat = input<string>();

  /** The values of the selected items. With string values, custom tags are values too. */
  readonly values = model<V[] | null | undefined>(undefined);
  /** The text of every tag, custom tags included. */
  readonly tags = model<string[] | undefined>(undefined);

  /** Typed text that matches no item becomes a tag on Enter or another separator key (makes this a tag box). */
  readonly allowCustomTags = input(false, { transform: booleanAttribute });
  /** Keys that turn the typed text into a tag (matChipInputSeparatorKeyCodes). */
  readonly separatorKeys = input<readonly string[]>(['Enter', ',']);
  /** Custom tags can be edited: double-click a chip or press Enter on it (mat-chip-row editable). */
  readonly editableTags = input(false, { transform: booleanAttribute });
  /** Selected items are not listed. When false they are listed with a checkmark. */
  readonly hideSelectedItems = input(true, { transform: booleanAttribute });
  readonly searchMode = input<PbChipsSearchMode>('autoSearch');
  readonly searchFilterCondition = input<PbSearchFilterCondition>('contains');
  readonly searchTextParseMode = input<PbSearchTextParseMode>('groupWordsByAnd');
  /** Milliseconds between the last keystroke and the search. */
  readonly searchDelay = input(0, { transform: numberAttribute });
  readonly listRenderMode = input<PbListRenderMode>('entire');
  /** Height of one list row for virtual scrolling. */
  readonly itemSize = input(48, { transform: numberAttribute });
  /** Placeholder text while there are no tags. */
  readonly nullText = input<string>();
  readonly clearButtonDisplayMode = input<PbClearButtonDisplayMode>('never');
  /** Shows the dropdown arrow button (default: when there is data to list). */
  readonly showDropDownButton = input<boolean | undefined, unknown>(undefined, {
    transform: (v: unknown) => (v === undefined ? undefined : booleanAttribute(v)),
  });
  readonly dropDownWidthMode = input<PbDropDownWidthMode>('contentOrEditorWidth');
  readonly readOnly = input(false, { transform: booleanAttribute });

  protected readonly valueModel = this.values;

  // ---------------------------------------------------------------- content

  protected readonly chips = contentChildren(PbChip);
  protected readonly columns = contentChildren(PbChipsColumn);
  protected readonly tagTemplate = contentChild(PbChipsTagTemplate);
  protected readonly itemTemplate = contentChild(PbChipsItemTemplate);
  protected readonly groupHeaderTemplate = contentChild(PbChipsGroupHeaderTemplate);
  protected readonly emptyTemplate = contentChild(PbChipsEmptyTemplate);

  private readonly formFieldRef = viewChild(MatFormField);
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('chipInput');
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly injector = inject(Injector);

  // ---------------------------------------------------------------- state

  protected readonly tagBox = computed(() => this.data() !== undefined || this.dataAsync() !== undefined || this.allowCustomTags());
  protected readonly id = `pb-chips-${nextId++}`;
  protected readonly panelId = `${this.id}-list`;
  protected readonly tagList = signal<Tag<T, V>[]>([]);
  protected readonly text = signal('');
  private readonly searchText = signal('');
  protected readonly open = signal(false);
  protected readonly focused = signal(false);
  protected readonly activeRow = signal(-1);
  private readonly scrollTop = signal(0);
  private readonly loaded = signal<readonly T[] | undefined>(undefined);
  protected readonly loading = signal(false);
  protected readonly originWidth = signal(0);
  private emittedValues: V[] | null | undefined = undefined;
  private emittedTags: string[] | undefined = undefined;
  private lastItems: readonly T[] | undefined;
  private tagKey = 0;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly items = computed<readonly T[]>(() => this.data() ?? this.loaded() ?? []);
  protected readonly hasData = computed(() => this.data() !== undefined || this.dataAsync() !== undefined);
  protected readonly interactive = computed(() => !this.isDisabled() && !this.readOnly());
  protected readonly dropDownButtonVisible = computed(() => this.showDropDownButton() ?? this.hasData());
  protected readonly clearVisible = computed(
    () => this.clearButtonDisplayMode() === 'auto' && this.tagList().length > 0 && this.interactive(),
  );
  protected readonly visibleColumns = computed(() =>
    this.columns()
      .map((column, order) => ({ column, order }))
      .filter(({ column }) => column.visible())
      .sort((a, b) => {
        const ai = a.column.visibleIndex() < 0 ? Number.MAX_SAFE_INTEGER : a.column.visibleIndex();
        const bi = b.column.visibleIndex() < 0 ? Number.MAX_SAFE_INTEGER : b.column.visibleIndex();
        return ai - bi || a.order - b.order;
      })
      .map(({ column }) => column),
  );
  protected readonly columnTemplate = computed(() =>
    this.visibleColumns()
      .map((c) => c.width() ?? 'minmax(0, 1fr)')
      .join(' '),
  );
  protected readonly placeholder = computed(() => (this.tagList().length === 0 ? (this.nullText() ?? '') : ''));
  protected readonly floatLabel = computed(() => (this.nullText() || this.tagList().length > 0 ? 'always' : 'auto'));

  protected readonly rows = computed<Row<T>[]>(() => {
    const words = this.words();
    const tags = this.tagList();
    const selected = (item: T) => tags.some((t) => t.hasItem && t.item === item);
    const listed = this.items().filter((item) => !(this.hideSelectedItems() && selected(item)) && this.matches(item, words));
    const result: Row<T>[] = [];
    const itemRow = (item: T, visibleIndex: number): Row<T> => ({
      kind: 'item',
      item,
      visibleIndex,
      selected: selected(item),
      disabled: this.isItemDisabled(item),
      index: result.length,
    });
    const groupField = this.groupFieldName();
    if (!groupField) {
      listed.forEach((item, i) => result.push(itemRow(item, i)));
    } else {
      const groups = new Map<string, T[]>();
      for (const item of listed) {
        const key = this.format(this.field(item, groupField));
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }
      let visibleIndex = 0;
      for (const [group, members] of groups) {
        result.push({ kind: 'group', group, visibleIndex: -1, selected: false, disabled: true, index: result.length });
        for (const item of members) result.push(itemRow(item, visibleIndex++));
      }
    }
    return result;
  });

  protected readonly emptyAreaVisible = computed(
    () => this.rows().length === 0 && !(this.allowCustomTags() && this.text().length > 0) && (this.hasData() || !!this.emptyTemplate()),
  );
  protected readonly panelVisible = computed(() => this.open() && (this.rows().length > 0 || this.emptyAreaVisible()));
  protected readonly virtual = computed(() => this.listRenderMode() === 'virtual');

  /** The rows to render: all of them, or (virtual) the window around the scroll position. */
  protected readonly renderedRange = computed(() => {
    const rows = this.rows();
    if (!this.virtual()) return { start: 0, rows };
    const size = this.itemSize();
    const start = Math.max(0, Math.floor(this.scrollTop() / size) - 6);
    const end = Math.min(rows.length, start + Math.ceil(275 / size) + 12);
    return { start, rows: rows.slice(start, end) };
  });

  protected readonly activeDescendant = computed(() =>
    this.panelVisible() && this.activeRow() >= 0 ? `${this.panelId}-${this.activeRow()}` : null,
  );

  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', panelClass: 'pb-chips-panel--above' },
  ];

  protected readonly overlayOrigin = computed(() => this.formFieldRef()?.getConnectedOverlayOrigin());

  constructor() {
    super();
    // Keep the chips in sync with [(values)] / [(tags)] / the form value and with the data.
    effect(() => {
      const items = this.items();
      const values = this.values();
      const tags = this.tags();
      this.visibleColumns();
      this.editFormat();
      untracked(() => this.sync(items, values, tags));
    });
    effect(() => {
      const loader = this.dataAsync();
      untracked(() => void this.load(loader));
    });
  }

  // ---------------------------------------------------------------- item fields

  private field(item: T | undefined, name: string | undefined): unknown {
    if (item == null || !name) return undefined;
    return (item as Record<string, unknown>)[name];
  }

  protected format(value: unknown): string {
    return value == null ? '' : String(value);
  }

  /** The text of an item: editFormat over the visible columns, textFieldName, or the item itself. */
  protected textOf(item: T | undefined): string {
    if (item == null) return '';
    const editFormat = this.editFormat();
    const columns = this.visibleColumns();
    if (editFormat && columns.length) {
      const args = columns.map((c) => this.format(this.field(item, c.fieldName())));
      return editFormat.replace(/\{(\d+)\}/g, (_, i: string) => args[Number(i)] ?? '');
    }
    const textField = this.textFieldName();
    return textField ? this.format(this.field(item, textField)) : this.format(item);
  }

  private itemValue(item: T): V {
    const valueField = this.valueFieldName();
    if (valueField) return this.field(item, valueField) as V;
    if (item !== null && typeof item === 'object' && 'value' in (item as object)) return (item as unknown as { value: V }).value;
    return item as unknown as V;
  }

  private isItemDisabled(item: T): boolean {
    const name = this.disabledFieldName();
    return !!name && this.field(item, name) === true;
  }

  private get stringValues(): boolean {
    const items = this.items();
    return items.length === 0 || (!this.valueFieldName() && typeof items[0] === 'string') || typeof this.itemValue(items[0]) === 'string';
  }

  // ---------------------------------------------------------------- sync

  private dataTag(item: T): Tag<T, V> {
    return { key: this.tagKey++, item, hasItem: true, isCustom: false, text: this.textOf(item), value: this.itemValue(item) };
  }

  private customTag(text: string): Tag<T, V> {
    return { key: this.tagKey++, hasItem: false, isCustom: true, text, value: this.stringValues ? (text as unknown as V) : undefined };
  }

  private sync(items: readonly T[], values: V[] | null | undefined, tags: string[] | undefined): void {
    const itemsChanged = items !== this.lastItems;
    this.lastItems = items;
    if (tags !== undefined && !same(tags, this.emittedTags)) {
      this.tagList.set(
        tags.map((text) => {
          const item = items.find((i) => this.textOf(i).toLocaleLowerCase() === text.toLocaleLowerCase());
          return item !== undefined ? this.dataTag(item) : this.customTag(text);
        }),
      );
      this.emittedTags = tags;
    } else if (values != null && (itemsChanged || !same(values, this.emittedValues))) {
      const custom = this.tagList().filter((t) => t.isCustom);
      const next: Tag<T, V>[] = [];
      for (const value of values) {
        const item = items.find((i) => this.itemValue(i) === value);
        if (item !== undefined) next.push(this.dataTag(item));
        else if (typeof value === 'string') next.push(this.customTag(value));
        else next.push({ key: this.tagKey++, hasItem: false, isCustom: false, text: this.format(value), value });
      }
      this.tagList.set(this.stringValues ? next : [...next, ...custom]);
      this.emittedValues = values;
    } else if (values === null && this.emittedValues !== null) {
      this.tagList.set([]);
      this.emittedValues = null;
    } else {
      // Columns or editFormat changed: refresh the text of data tags.
      this.tagList.update((list) => list.map((t) => (t.hasItem ? { ...t, text: this.textOf(t.item) } : t)));
    }
  }

  private async load(loader: (() => Promise<readonly T[]>) | undefined): Promise<void> {
    if (!loader) {
      this.loaded.set(undefined);
      return;
    }
    this.loading.set(true);
    try {
      this.loaded.set(await loader());
    } finally {
      this.loading.set(false);
    }
  }

  private emit(): void {
    const tags = this.tagList();
    const values = tags.filter((t) => t.hasItem || (t.isCustom && this.stringValues)).map((t) => t.value as V);
    const texts = tags.map((t) => t.text);
    this.emittedValues = values;
    this.emittedTags = texts;
    this.update(values);
    this.tags.set(texts);
  }

  // ---------------------------------------------------------------- search

  private words(): string[] {
    const text = this.searchText().trim();
    if (!text || this.searchMode() === 'disabled') return [];
    return this.searchTextParseMode() === 'exactMatch' ? [text] : text.split(/\s+/);
  }

  private wordMatches(candidate: string, word: string): boolean {
    const c = candidate.toLocaleLowerCase();
    const w = word.toLocaleLowerCase();
    switch (this.searchFilterCondition()) {
      case 'startsWith':
        return c.startsWith(w);
      case 'equals':
        return c === w;
      default:
        return c.includes(w);
    }
  }

  private matches(item: T, words: string[]): boolean {
    if (!words.length) return true;
    const columns = this.visibleColumns();
    const texts = columns.length
      ? columns.filter((c) => c.searchEnabled()).map((c) => this.format(this.field(item, c.fieldName())))
      : [this.textOf(item)];
    const word = (w: string) => texts.some((t) => this.wordMatches(t, w));
    return this.searchTextParseMode() === 'groupWordsByOr' ? words.some(word) : words.every(word);
  }

  /** Splits `value` into search matches and the rest. */
  protected highlight(value: string): PbHighlightSegment[] {
    const words = this.words();
    if (!words.length) return [{ text: value, match: false }];
    const marks = new Array<boolean>(value.length).fill(false);
    const lower = value.toLocaleLowerCase();
    for (const word of words.map((w) => w.toLocaleLowerCase())) {
      const condition = this.searchFilterCondition();
      if (condition === 'startsWith') {
        if (lower.startsWith(word)) marks.fill(true, 0, word.length);
      } else if (condition === 'equals') {
        if (lower === word) marks.fill(true);
      } else {
        for (let at = lower.indexOf(word); at >= 0 && word.length; at = lower.indexOf(word, at + word.length)) {
          marks.fill(true, at, at + word.length);
        }
      }
    }
    const segments: PbHighlightSegment[] = [];
    for (let i = 0; i < value.length; ) {
      let end = i;
      while (end < value.length && marks[end] === marks[i]) end++;
      segments.push({ text: value.slice(i, end), match: marks[i] });
      i = end;
    }
    return segments;
  }

  // ---------------------------------------------------------------- list

  private firstSelectable(from: number, step: number): number {
    const rows = this.rows();
    for (let i = from; i >= 0 && i < rows.length; i += step) {
      if (rows[i].kind === 'item' && !rows[i].disabled) return i;
    }
    return -1;
  }

  protected openPanel(): void {
    if (!this.interactive() || this.open()) return;
    const origin = this.overlayOrigin()?.nativeElement as HTMLElement | undefined;
    this.originWidth.set(origin?.getBoundingClientRect().width ?? 0);
    this.scrollTop.set(0);
    this.open.set(true);
    this.activeRow.set(this.firstSelectable(0, 1));
  }

  protected close(): void {
    this.open.set(false);
    this.activeRow.set(-1);
  }

  protected readonly overlayWidth = computed(() => (this.dropDownWidthMode() === 'editorWidth' ? this.originWidth() : undefined));
  protected readonly overlayMinWidth = computed(() =>
    this.dropDownWidthMode() === 'contentOrEditorWidth' ? this.originWidth() : undefined,
  );

  private moveActive(step: number): void {
    const rows = this.rows();
    if (!rows.length) return;
    const current = this.activeRow();
    const start = current < 0 ? (step > 0 ? 0 : rows.length - 1) : current + step;
    const next = this.firstSelectable(start, step);
    if (next >= 0) this.setActive(next, true);
  }

  protected setActive(index: number, scroll = false): void {
    this.activeRow.set(index);
    if (scroll) afterNextRender(() => this.scrollActiveIntoView(), { injector: this.injector });
  }

  private scrollActiveIntoView(): void {
    const panel = this.panelRef()?.nativeElement;
    const index = this.activeRow();
    if (!panel || index < 0) return;
    if (!this.virtual()) {
      panel.querySelector(`#${CSS.escape(`${this.panelId}-${index}`)}`)?.scrollIntoView({ block: 'nearest' });
      return;
    }
    const size = this.itemSize();
    const header = panel.querySelector<HTMLElement>('.pb-chips__columns-header')?.offsetHeight ?? 0;
    const top = parseFloat(getComputedStyle(panel).paddingTop) + header + index * size;
    if (top - header < panel.scrollTop) panel.scrollTop = top - header;
    else if (top + size > panel.scrollTop + panel.clientHeight) panel.scrollTop = top + size - panel.clientHeight;
    this.scrollTop.set(panel.scrollTop);
  }

  protected onPanelScroll(event: Event): void {
    if (this.virtual()) this.scrollTop.set((event.target as HTMLElement).scrollTop);
  }

  protected onOutsideClick(event: MouseEvent): void {
    const field = this.overlayOrigin()?.nativeElement as HTMLElement | undefined;
    if (field && event.target instanceof Node && field.contains(event.target)) return;
    this.close();
  }

  // ---------------------------------------------------------------- input

  protected onFocus(): void {
    this.focused.set(true);
    this.openPanel();
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.close();
    this.markTouched();
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.text.set(value);
    clearTimeout(this.searchTimer);
    const apply = () => {
      this.searchText.set(value);
      if (!this.open()) this.openPanel();
      this.activeRow.set(this.firstSelectable(0, 1));
    };
    if (this.searchDelay() > 0) this.searchTimer = setTimeout(apply, this.searchDelay());
    else apply();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive()) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open() || event.altKey) this.openPanel();
        else this.moveActive(1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (event.altKey) this.close();
        else if (this.open()) this.moveActive(-1);
        return;
      case 'Home':
      case 'End':
        if (this.open() && !this.text()) {
          event.preventDefault();
          const rows = this.rows();
          this.setActive(event.key === 'Home' ? this.firstSelectable(0, 1) : this.firstSelectable(rows.length - 1, -1), true);
        }
        return;
      case 'Escape':
        if (this.panelVisible()) {
          event.preventDefault();
          event.stopPropagation();
        }
        this.close();
        return;
      case 'Tab':
        this.close();
        return;
    }
    if (!this.separatorKeys().includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Enter' && this.panelVisible() && this.activeRow() >= 0 && (this.text() || !this.allowCustomTags())) {
      event.preventDefault();
      this.selectRow(this.activeRow());
      return;
    }
    if (event.key !== 'Enter' || this.text().trim()) event.preventDefault();
    this.commitText();
  }

  /** Turns the typed text into a tag: a matching item, or a custom tag when allowed. */
  private commitText(): void {
    const value = this.text().trim();
    if (!value) return;
    const item = this.items().find((i) => !this.isItemDisabled(i) && this.textOf(i).toLocaleLowerCase() === value.toLocaleLowerCase());
    const tags = this.tagList();
    if (item !== undefined) {
      if (!tags.some((t) => t.hasItem && t.item === item)) this.tagList.set([...tags, this.dataTag(item)]);
    } else if (this.allowCustomTags()) {
      if (!tags.some((t) => t.text.toLocaleLowerCase() === value.toLocaleLowerCase())) this.tagList.set([...tags, this.customTag(value)]);
    } else {
      return;
    }
    this.clearText();
    this.emit();
  }

  private clearText(): void {
    this.text.set('');
    this.searchText.set('');
    const input = this.inputRef()?.nativeElement;
    if (input) input.value = '';
  }

  protected selectRow(index: number): void {
    const row = this.rows()[index];
    if (!row || row.kind !== 'item' || row.disabled) return;
    const tags = this.tagList();
    const existing = tags.findIndex((t) => t.hasItem && t.item === row.item);
    this.tagList.set(existing >= 0 ? tags.filter((_, i) => i !== existing) : [...tags, this.dataTag(row.item!)]);
    this.clearText();
    this.emit();
    const rows = this.rows();
    let next = Math.min(index, rows.length - 1);
    if (next >= 0 && (rows[next].kind !== 'item' || rows[next].disabled)) {
      const forward = this.firstSelectable(next, 1);
      next = forward >= 0 ? forward : this.firstSelectable(next, -1);
    }
    this.activeRow.set(next);
  }

  // ---------------------------------------------------------------- tags

  protected removeTag(index: number): void {
    if (!this.interactive()) return;
    this.tagList.update((list) => list.filter((_, i) => i !== index));
    this.emit();
  }

  protected canEdit(tag: Tag<T, V>): boolean {
    return this.interactive() && this.editableTags() && (tag.isCustom || !this.hasData());
  }

  protected onEdited(index: number, value: string): void {
    const text = value.trim();
    if (!text) {
      this.removeTag(index);
      return;
    }
    const item = this.items().find((i) => this.textOf(i).toLocaleLowerCase() === text.toLocaleLowerCase());
    this.tagList.update((list) => list.map((t, i) => (i === index ? (item !== undefined ? this.dataTag(item) : this.customTag(text)) : t)));
    this.emit();
  }

  protected clear(): void {
    this.tagList.set([]);
    this.clearText();
    this.emit();
    this.focusInput();
  }

  protected toggleFromButton(): void {
    if (this.open()) this.close();
    else this.openPanel();
    this.focusInput();
  }

  /** Focuses the search input. */
  focusInput(): void {
    this.inputRef()?.nativeElement.focus();
  }

  /** Opens the dropdown list. */
  openList(): void {
    this.focusInput();
    this.openPanel();
  }

  protected drop(event: CdkDragDrop<unknown>): void {
    if (event.previousIndex === event.currentIndex) return;
    if (this.tagBox()) {
      const list = [...this.tagList()];
      const [tag] = list.splice(event.previousIndex, 1);
      list.splice(event.currentIndex, 0, tag);
      this.tagList.set(list);
      this.emit();
    } else {
      this.reordered.emit({ previousIndex: event.previousIndex, currentIndex: event.currentIndex });
    }
  }

  // ---------------------------------------------------------------- template contexts

  protected tagContext(index: number): { $implicit: PbChipsTagContext<T> } {
    const tag = this.tagList()[index];
    return { $implicit: { dataItem: tag.item, isCustom: tag.isCustom, displayText: tag.text, remove: () => this.removeTag(index) } };
  }

  protected itemContext(row: Row<T>): { $implicit: PbChipsItemContext<T, V> } {
    const display = this.textOf(row.item);
    return {
      $implicit: {
        dataItem: row.item!,
        value: this.itemValue(row.item!),
        displayText: display,
        highlightedDisplayText: this.highlight(display),
        visibleIndex: row.visibleIndex,
        selected: row.selected,
      },
    };
  }

  protected cellText(row: Row<T>, column: PbChipsColumn): string {
    return this.format(this.field(row.item, column.fieldName()));
  }

  protected cellContext(row: Row<T>, column: PbChipsColumn): { $implicit: PbChipsCellContext<T> } {
    const value = this.field(row.item, column.fieldName());
    const display = this.format(value);
    return {
      $implicit: {
        dataItem: row.item!,
        column,
        value,
        displayText: display,
        highlightedDisplayText: this.highlight(display),
        visibleIndex: row.visibleIndex,
      },
    };
  }
}
