import { NgTemplateOutlet } from '@angular/common';
import {
  afterEveryRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  numberAttribute,
  output,
  Signal,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatProgressBar } from '@angular/material/progress-bar';
import { PbDialog } from '../dialog/dialog';
import { PbPageEvent, PbPaginator } from '../paginator/paginator';
import {
  PbGridColumn,
  PbGridDetailTemplate,
  PbGridEditFormTemplate,
  PbGridEmptyTemplate,
  PbGridGroupRowTemplate,
  PbGridPreviewTemplate,
  PbGridSummary,
  PbGridToolbar,
} from './grid-column';
import { download, ExportRow, toCsv, toXlsx } from './grid-export';
import {
  cloneItem,
  compareValues,
  convertTo,
  copyInto,
  filterFields,
  filterMatches,
  filterText,
  formatValue,
  getField,
  inferType,
  PbGridTreeConfig,
  isoDay,
  OPERATOR_GLYPH,
  OPERATOR_TEXT,
  operatorsFor,
  parseIsoDay,
  PbGridBatchChanges,
  PbGridCellContext,
  PbGridColumnLayout,
  PbGridColumnResizeMode,
  PbGridContextMenuEvent,
  PbGridContextMenuItem,
  PbGridContextMenuTarget,
  PbGridCustomizeElementEvent,
  PbGridCustomSummaryEvent,
  PbGridDataRequest,
  PbGridDataResult,
  PbGridDataType,
  PbGridDetailRowDisplayMode,
  PbGridDropPosition,
  PbGridEditContext,
  PbGridEditFormContext,
  PbGridEditMode,
  PbGridEditorType,
  PbGridEditSavingEvent,
  PbGridElementType,
  PbGridExportOptions,
  PbGridFieldSource,
  PbGridFilter,
  PbGridFilterOperator,
  PbGridFilterPanelDisplayMode,
  PbGridFilters,
  PbGridFixedPosition,
  PbGridFormat,
  PbGridGroupFooterDisplayMode,
  PbGridGroupRowContext,
  PbGridItemDeletingEvent,
  PbGridItemsDroppedEvent,
  PbGridLayout,
  PbGridLines,
  PbGridNewItemRowPosition,
  PbGridPagerPosition,
  PbGridSelectAllMode,
  PbGridSelectionMode,
  PbGridSortOrder,
  PbGridSummaryType,
  PbGridSummaryValue,
  sameValue,
  setField,
  splitWords,
  toDate,
  tryConvert,
} from './grid-model';
import { PbLayerOrder } from '../core/layer-order';

interface SummaryDef {
  type: PbGridSummaryType;
  field?: string;
  footerColumn?: string;
  displayText?: string;
  format?: PbGridFormat;
  name?: string;
}

interface GridGroup<T> {
  column: PbGridColumn;
  key: unknown;
  text: string;
  items: T[];
  children: GridGroup<T>[] | null;
  path: string;
  level: number;
  rowSummaries: PbGridSummaryValue[];
  footerSummaries: PbGridSummaryValue[];
}

interface GridRow<T> {
  kind: 'data' | 'group' | 'groupFooter';
  item?: T;
  group?: GridGroup<T>;
  level: number;
  index: number;
  dataIndex: number;
  inserted?: boolean;
  /** Tree list: the node's depth, whether it has (or may load) children, is expanded, is loading. */
  treeLevel?: number;
  treeHasChildren?: boolean;
  treeExpanded?: boolean;
  treeLoading?: boolean;
}

/** A tree list node (pb-tree-list). */
interface TreeNode<T> {
  item: T;
  key: unknown;
  parent: TreeNode<T> | null;
  children: TreeNode<T>[];
  level: number;
  /** Has children that are not loaded yet (hasChildrenField, load on demand). */
  mayHaveChildren: boolean;
}

function isAncestor<T>(candidate: TreeNode<T>, node: TreeNode<T> | null): boolean {
  for (let current = node; current; current = current.parent) if (current === candidate) return true;
  return false;
}

interface HeaderCell {
  column: PbGridColumn;
  colspan: number;
  rowspan: number;
  position: number;
  leaf: boolean;
}

interface FilterNode {
  group: boolean;
  or: boolean;
  children: FilterNode[];
  field: string;
  operator: PbGridFilterOperator;
  value: string;
}

interface Popup {
  kind: 'menu' | 'filter';
  x: number;
  y: number;
  items: PbGridContextMenuItem[];
  column?: PbGridColumn;
}

interface FilterMenuValue {
  value: unknown;
  text: string;
  checked: boolean;
}

interface GridDragState {
  kind: 'row' | 'column';
  gridId: string;
  group?: string | null;
  allowInternal?: boolean;
  allowExternal?: boolean;
  key?: string;
  fromPanel?: boolean;
}

// Shared by every grid on the page: the current drag and the grids that can supply dragged rows.
const gridRegistry = new Map<string, PbDataGrid<any>>();
let gridDrag: GridDragState | null = null;
let gridCounter = 0;

const ROW_KEYS = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageDown', 'PageUp', ' ', 'Enter', 'F2', 'Delete'];

/**
 * A data grid in the spirit of DevExpress's Blazor Grid, styled with Material 3 tokens and matching the
 * Blazor PBDataGrid: data binding (array or async data provider), sorting, grouping, filter row / filter
 * menus / filter panel / filter builder / search, summaries, selection, focused row, five edit modes with
 * validation, master-detail, templates, column resizing / reordering / fixing / hiding / bands, layout
 * save and restore, adaptivity, XLSX/CSV export, context menus, row drag and drop, paging or virtual
 * scrolling, and keyboard navigation.
 */
@Component({
  selector: 'pb-data-grid',
  imports: [NgTemplateOutlet, MatButton, MatIconButton, MatCheckbox, MatProgressBar, PbDialog, PbPaginator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.css',
  host: {
    '[class]': 'rootClass()',
    '[attr.id]': 'gridId',
    '(pointerdown)': 'onHostPointerDown($event)',
    '(dragstart)': 'onDragStart($event)',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
    '(dragend)': 'onDragEnd()',
  },
})
export class PbDataGrid<T = any> implements PbGridFieldSource {
  // ------------------------------------------------------------------ data
  readonly data = input<readonly T[]>([]);
  /** Loads one page at a time (e.g. over HTTP); the grid passes sorting, filters and search. */
  readonly dataProvider = input<(request: PbGridDataRequest) => Promise<PbGridDataResult<T>>>();
  /** Identifies rows for selection, focus, expansion and editing. */
  readonly keyField = input<string>();
  readonly label = input<string>();
  readonly locale = input('en-US');
  readonly currency = input('USD');

  // ------------------------------------------------------------------ paging and scrolling
  readonly pageSize = model(10);
  readonly pageIndex = model(0);
  readonly pageSizeOptions = input<readonly number[]>([10, 20, 50, 100]);
  readonly showPager = input(true, { transform: booleanAttribute });
  readonly pagerPosition = input<PbGridPagerPosition>('bottom');
  readonly virtualScrolling = input(false, { transform: booleanAttribute });
  /** CSS height of the scrolling area (the header stays on top). */
  readonly height = input<string>();
  readonly rowHeight = input(52, { transform: numberAttribute });

  // ------------------------------------------------------------------ features
  readonly showSearchBox = input(false, { transform: booleanAttribute });
  readonly searchText = model('');
  readonly searchPlaceholder = input('Search…');
  readonly showFilterRow = input(false, { transform: booleanAttribute });
  readonly showFilterMenuButtons = input(false, { transform: booleanAttribute });
  readonly filterPanelDisplayMode = input<PbGridFilterPanelDisplayMode>('never');
  /** Extra filter criteria (also what the filter builder edits). */
  readonly filter = model<PbGridFilter | null>(null);
  readonly showGroupPanel = input(false, { transform: booleanAttribute });
  readonly showGroupedColumns = input(false, { transform: booleanAttribute });
  readonly autoExpandAllGroups = input(false, { transform: booleanAttribute });
  readonly groupFooterDisplayMode = input<PbGridGroupFooterDisplayMode>('auto');
  readonly allowSort = input(true, { transform: booleanAttribute });
  readonly allowGroup = input(true, { transform: booleanAttribute });
  readonly allowColumnReorder = input(true, { transform: booleanAttribute });
  readonly columnResizeMode = input<PbGridColumnResizeMode>('disabled');

  // ------------------------------------------------------------------ selection and focus
  readonly selectionMode = input<PbGridSelectionMode>('multiple');
  readonly selectAllMode = input<PbGridSelectAllMode>('page');
  readonly allowSelectRowByClick = input(false, { transform: booleanAttribute });
  readonly selectedItems = model<readonly T[]>([]);
  readonly focusedRowEnabled = input(false, { transform: booleanAttribute });
  readonly focusedItem = model<T | null>(null);
  readonly rowClick = output<T>();
  readonly rowDoubleClick = output<T>();

  // ------------------------------------------------------------------ editing
  readonly editMode = input<PbGridEditMode>('editForm');
  readonly newItemRowPosition = input<PbGridNewItemRowPosition>('disabled');
  readonly editNewRowPosition = input<'top' | 'bottom'>('top');
  /** Creates the item for a new row (default: an empty object). */
  readonly createItem = input<() => T>();
  readonly customizeEditModel = input<(e: { editModel: T; dataItem: T | null; isNew: boolean; parentDataItem?: T | null }) => void>();
  /** Saves an edit; without it the grid copies the edit into the item (or adds the new item to `data`). */
  readonly editSaving = input<(e: PbGridEditSavingEvent<T>) => void | Promise<void>>();
  readonly itemDeleting = input<(e: PbGridItemDeletingEvent<T>) => void | Promise<void>>();
  readonly batchSaving = input<(changes: PbGridBatchChanges<T>) => void | Promise<void>>();
  /** Whole-row validation, in addition to the columns' validators: field -> message. */
  readonly validateItem = input<(item: T) => Record<string, string> | null>();
  readonly confirmDelete = input(true, { transform: booleanAttribute });
  readonly popupEditFormTitle = input('Edit row');
  readonly editingEnabled = input(false, { transform: booleanAttribute });
  readonly saved = output<T>();

  // ------------------------------------------------------------------ templates and appearance
  readonly detailRowDisplayMode = input<PbGridDetailRowDisplayMode>('auto');
  readonly autoCollapseDetailRow = input(false, { transform: booleanAttribute });
  readonly emptyText = input('No data to display');
  readonly gridLines = input<PbGridLines>('horizontal');
  readonly alternatingRows = input(false, { transform: booleanAttribute });
  readonly dense = input(false, { transform: booleanAttribute });
  readonly customizeElement = input<(e: PbGridCustomizeElementEvent<T>) => void>();
  readonly adaptivity = input(false, { transform: booleanAttribute });
  readonly customSummary = input<(e: PbGridCustomSummaryEvent<T>) => void>();

  // ------------------------------------------------------------------ menus, layout, drag and drop
  /** 'all', or the menus to enable: 'header dataRow groupPanel footer'. */
  readonly contextMenus = input<string | readonly PbGridContextMenuTarget[]>('');
  readonly customizeContextMenu = input<(e: PbGridContextMenuEvent<T>) => void>();
  readonly layout = input<PbGridLayout | null>(null);
  readonly layoutChange = output<PbGridLayout>();
  readonly allowDragRows = input(false, { transform: booleanAttribute });
  /** Grids with the same group exchange rows. */
  readonly dragDropGroup = input<string>();
  readonly allowedDropTarget = input<'all' | 'internal' | 'external' | 'none'>('all');
  readonly itemsDropped = input<(e: PbGridItemsDroppedEvent<T>) => void>();

  // ------------------------------------------------------------------ content
  protected readonly columns = contentChildren(PbGridColumn, { descendants: true });
  private readonly summaries = contentChildren(PbGridSummary, { descendants: true });
  protected readonly detailTemplate = contentChild(PbGridDetailTemplate);
  protected readonly previewTemplate = contentChild(PbGridPreviewTemplate);
  protected readonly groupRowTemplate = contentChild(PbGridGroupRowTemplate);
  protected readonly emptyTemplate = contentChild(PbGridEmptyTemplate);
  protected readonly editFormTemplate = contentChild(PbGridEditFormTemplate);
  protected readonly toolbar = contentChild(PbGridToolbar);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly popupElement = viewChild<ElementRef<HTMLElement>>('popup');
  private readonly scrollElement = viewChild<ElementRef<HTMLElement>>('scroll');
  protected readonly gridId = `pb-grid-${++gridCounter}`;

  // ------------------------------------------------------------------ state
  /** Bumped when the grid changed the data in place (edits, deletes). */
  private readonly version = signal(0);
  protected readonly groupPanelVisible = linkedSignal(() => this.showGroupPanel());
  protected readonly filterRowVisible = linkedSignal(() => this.showFilterRow());
  protected readonly filterEnabled = signal(true);
  private readonly groupExpanded = signal(new Map<string, boolean>());
  private readonly expandAll = signal<boolean | null>(null);
  private readonly expandedDetails = signal(new Set<unknown>());
  protected readonly expandedAdaptive = signal(new Set<unknown>());
  private readonly userSummaries = signal<SummaryDef[]>([]);
  protected readonly keyboardRow = signal(-1);
  private readonly selectionAnchor = signal<number | null>(null);
  private readonly gridWidth = signal(0);
  protected readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(480);

  protected readonly editItem = signal<T | null>(null);
  protected readonly editModel = signal<T | null>(null);
  protected readonly editIsNew = signal(false);
  protected readonly editCell = signal<string | null>(null);
  protected readonly editErrors = signal<Record<string, string[]>>({});
  protected readonly popupEditOpen = signal(false);
  private readonly editTick = signal(0);

  private readonly batchUpdated = signal(new Map<unknown, { original: T; clone: T }>());
  private readonly batchInserted = signal<T[]>([]);
  private readonly batchDeleted = signal(new Map<unknown, T>());
  protected readonly batchCell = signal<{ key: unknown; column: string } | null>(null);
  private readonly batchErrors = signal(new Map<string, string>());

  protected readonly pendingDelete = signal<T | null>(null);
  protected readonly deleteDialogOpen = signal(false);
  protected readonly columnChooserOpen = signal(false);
  protected readonly filterBuilderOpen = signal(false);
  protected readonly filterBuilderRoot = signal<FilterNode>(this.newGroupNode());
  protected readonly fbVersion = signal(0);
  private chooserDragged: PbGridColumn | null = null;

  protected readonly popup = signal<Popup | null>(null);
  private popupPositioned = false;
  protected readonly filterMenuValues = signal<FilterMenuValue[]>([]);
  protected readonly filterMenuSearch = signal('');

  private readonly providerResult = signal<{ signature: string; result: PbGridDataResult<T> } | null>(null);
  protected readonly loading = signal(false);
  private providerSignature = '';
  private readonly virtualCache = signal(new Map<number, T>());
  private readonly virtualTotal = signal(0);
  private readonly virtualPending = new Set<number>();
  private virtualSignature = '';

  private draggedItems: T[] = [];
  private focusRowAfterRender: number | null = null;
  private focusEditorAfterRender = false;
  private suppressHeaderClick = false;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private filterTimer: ReturnType<typeof setTimeout> | undefined;
  private outsideListener: ((e: Event) => void) | null = null;

  protected operatorLabel(op: PbGridFilterOperator): string {
    return OPERATOR_TEXT[op];
  }

  protected operatorSymbol(op: PbGridFilterOperator): string {
    return OPERATOR_GLYPH[op];
  }

  constructor() {
    // Keeps this overlay in the Figma Layering order in the top layer.
    inject(PbLayerOrder);
    gridRegistry.set(this.gridId, this);
    const observer = new ResizeObserver(() => {
      this.syncFixedColumns();
      this.gridWidth.set(this.host.clientWidth);
      const scroll = this.scrollElement()?.nativeElement;
      if (scroll) this.viewportHeight.set(scroll.clientHeight);
    });
    observer.observe(this.host);
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      gridRegistry.delete(this.gridId);
      this.removeOutsideListener();
      clearTimeout(this.searchTimer);
      clearTimeout(this.filterTimer);
    });

    afterEveryRender(() => {
      this.syncFixedColumns();
      this.positionPopup();
      if (this.focusRowAfterRender != null) {
        const index = this.focusRowAfterRender;
        this.focusRowAfterRender = null;
        (this.host.querySelector(`.pb-data-grid__scroll > table > tbody > tr[data-row="${index}"]`) as HTMLElement | null)?.focus();
      }
      if (this.focusEditorAfterRender) {
        this.focusEditorAfterRender = false;
        (this.host.querySelector('.pb-data-grid__editor--autofocus, .pb-data-grid__edit-row .pb-data-grid__editor:not([disabled])') as HTMLElement | null)?.focus();
      }
    });

    // Apply a layout given as input (and again whenever it changes).
    effect(() => {
      const layout = this.layout();
      const columns = this.columns();
      if (layout && columns.length) untracked(() => this.applyLayout(layout));
    });

    // Paged data provider: load the page whenever the request changes.
    effect(() => {
      const provider = this.dataProvider();
      if (!provider || this.virtualScrolling()) return;
      const request = this.providerRequest(this.pagingActive() ? this.pageIndex() * this.pageSize() : 0, this.pagingActive() ? this.pageSize() : 1_000_000);
      const signature = JSON.stringify(request);
      this.version();
      untracked(() => this.loadFromProvider(provider, request, signature));
    });

    // Virtual scrolling over a provider: fetch the blocks around the visible window.
    effect(() => {
      const provider = this.dataProvider();
      if (!provider || !this.virtualScrolling()) return;
      const request = this.providerRequest(0, 0);
      const signature = JSON.stringify(request);
      this.version();
      const [start, end] = this.virtualRange();
      untracked(() => {
        if (signature !== this.virtualSignature) {
          this.virtualSignature = signature;
          this.virtualPending.clear();
          this.virtualCache.set(new Map());
        }
        for (let block = Math.floor(start / 100); block * 100 < Math.max(end, start + 1); block++) this.loadVirtualBlock(provider, request, block);
      });
    });
  }

  // ================================================================== columns

  private readonly gridColumns = computed(() => this.columns());

  /** The band a column belongs to (only bands of this grid count). */
  private bandOf(column: PbGridColumn): PbGridColumn | null {
    const band = column.band;
    return band && band.kind === 'band' && this.gridColumns().includes(band) ? band : null;
  }

  private ancestors(column: PbGridColumn): PbGridColumn[] {
    const chain: PbGridColumn[] = [];
    for (let band = this.bandOf(column); band; band = this.bandOf(band)) chain.unshift(band);
    return chain;
  }

  private siblingsOf(parent: PbGridColumn | null): PbGridColumn[] {
    return this.gridColumns()
      .filter((c) => this.bandOf(c) === parent)
      .sort((a, b) => a.currentVisibleIndex() - b.currentVisibleIndex() || a.order - b.order);
  }

  /** Leaf columns in display order, hidden ones included. */
  protected readonly orderedLeaves = computed(() => {
    const result: PbGridColumn[] = [];
    const walk = (band: PbGridColumn | null) => {
      for (const column of this.siblingsOf(band)) {
        if (column.kind === 'band') walk(column);
        else result.push(column);
      }
    };
    walk(null);
    return result;
  });

  private shown(column: PbGridColumn): boolean {
    if (!column.currentVisible()) return false;
    const band = this.bandOf(column);
    if (band && !this.shown(band)) return false;
    return this.showGroupedColumns() || !this.allowGroup() || column.currentGroupIndex() < 0 || !column.canGroup || !!this.dataProvider();
  }

  private readonly baseLeaves = computed(() => {
    const leaves = this.orderedLeaves().filter((c) => this.shown(c));
    return [
      ...leaves.filter((c) => c.currentFixed() === 'left'),
      ...leaves.filter((c) => c.currentFixed() === 'none'),
      ...leaves.filter((c) => c.currentFixed() === 'right'),
    ];
  });

  /** Columns hidden by adaptivity: highest priority first, until the rest fit. */
  protected readonly adaptiveHidden = computed(() => {
    const hidden = new Set<PbGridColumn>();
    const width = this.gridWidth();
    if (!this.adaptivity() || width <= 0) return hidden;
    const leaves = this.baseLeaves();
    const needed = () =>
      leaves.filter((c) => !hidden.has(c)).reduce((sum, c) => sum + (pixelWidth(c.currentWidth()) ?? c.minWidth()), 0) + 48 + this.groupedColumns().length * 32;
    const candidates = leaves
      .filter((c) => c.adaptivePriority() > 0 && c.isData)
      .sort((a, b) => b.adaptivePriority() - a.adaptivePriority() || leaves.indexOf(b) - leaves.indexOf(a));
    for (const column of candidates) {
      if (needed() <= width) break;
      hidden.add(column);
    }
    return hidden;
  });

  protected readonly leaves = computed(() => this.baseLeaves().filter((c) => !this.adaptiveHidden().has(c)));
  protected readonly adaptiveColumns = computed(() => this.orderedLeaves().filter((c) => this.adaptiveHidden().has(c)));

  private readonly dataColumns = computed(() => this.gridColumns().filter((c) => c.isData));

  protected readonly groupedColumns = computed(() =>
    this.dataProvider() || !this.allowGroup()
      ? []
      : this.dataColumns()
          .filter((c) => c.currentGroupIndex() >= 0 && c.canGroup)
          .sort((a, b) => a.currentGroupIndex() - b.currentGroupIndex() || a.order - b.order),
  );

  private readonly sortedColumns = computed(() =>
    this.dataColumns()
      .filter((c) => c.currentSort() !== 'none' && c.currentGroupIndex() < 0)
      .sort((a, b) => (a.currentSortIndex() < 0 ? 1e9 : a.currentSortIndex()) - (b.currentSortIndex() < 0 ? 1e9 : b.currentSortIndex()) || a.order - b.order),
  );

  getColumn(key: string): PbGridColumn | undefined {
    return this.gridColumns().find((c) => c.key === key) ?? this.gridColumns().find((c) => c.field() === key);
  }

  private fieldColumn(field: string): PbGridColumn | undefined {
    return this.dataColumns().find((c) => c.field() === field || (!c.field() && c.key === field));
  }

  protected caption = (field: string) => this.fieldColumn(field)?.displayCaption ?? splitWords(field.split('.').pop()!);

  /** The column's value type: declared, from its items, or inferred from the data. */
  columnType(column: PbGridColumn): PbGridDataType {
    const declared = column.dataType();
    if (declared) return declared;
    if (column.items()) return 'enum';
    const rows = this.data();
    for (let i = 0; i < rows.length && i < 50; i++) {
      const value = this.cellValue(rows[i], column);
      if (value != null) return inferType(value);
    }
    return 'string';
  }

  cellValue(item: T, column: PbGridColumn): unknown {
    const calculate = column.calculate();
    if (calculate) return calculate(item);
    const field = column.field();
    return field ? getField(item, field) : undefined;
  }

  formatCell(column: PbGridColumn, value: unknown): string {
    return formatValue(value, column.format(), this.locale(), this.currency());
  }

  // PbGridFieldSource (filters evaluate through the columns, so unbound columns filter too)
  type(field: string): PbGridDataType {
    const column = this.fieldColumn(field);
    return column ? this.columnType(column) : 'string';
  }

  value(item: unknown, field: string): unknown {
    const column = this.fieldColumn(field);
    return column ? this.cellValue(item as T, column) : getField(item, field);
  }

  text(item: unknown, field: string): string {
    const column = this.fieldColumn(field);
    return column ? this.formatCell(column, this.cellValue(item as T, column)) : String(getField(item, field) ?? '');
  }

  protected alignClass(column: PbGridColumn): string {
    let align = column.textAlign();
    if (align === 'auto') {
      const type = column.isData ? this.columnType(column) : 'string';
      align = type === 'number' ? 'end' : type === 'boolean' || column.kind === 'selection' ? 'center' : 'start';
    }
    return align === 'end' ? 'pb-data-grid__cell--end' : align === 'center' ? 'pb-data-grid__cell--center' : '';
  }

  protected editorType(column: PbGridColumn): PbGridEditorType {
    const editor = column.editor();
    if (editor !== 'auto') return editor;
    switch (this.columnType(column)) {
      case 'enum':
        return 'select';
      case 'boolean':
        return 'checkbox';
      case 'date':
        return 'date';
      case 'number':
        return 'number';
      default:
        return 'text';
    }
  }

  protected comboItems(column: PbGridColumn): readonly unknown[] {
    return column.items() ?? [];
  }

  // ================================================================== key, filters

  keyOf(item: T): unknown {
    const field = this.keyField();
    return field ? (getField(item, field) ?? item) : item;
  }

  private rowFilterOf(column: PbGridColumn): PbGridFilter | null {
    const op = column.filterRowOperator() ?? this.defaultOperator(column);
    if (op === 'blank' || op === 'notBlank') return PbGridFilters.condition(column.filterField, op);
    const text = column.filterRowText();
    return text ? PbGridFilters.condition(column.filterField, op, text) : null;
  }

  protected defaultOperator(column: PbGridColumn): PbGridFilterOperator {
    return this.columnType(column) === 'string' ? 'contains' : 'equals';
  }

  /** The criteria, filter row and filter menus combined (what the filter panel shows). */
  protected readonly userFilter = computed(() => {
    const parts: (PbGridFilter | null)[] = [this.filter()];
    for (const column of this.dataColumns()) {
      if (!column.canFilter) continue;
      parts.push(this.rowFilterOf(column));
      const values = column.filterValues();
      if (values) parts.push(PbGridFilters.in(column.filterField, values));
    }
    return PbGridFilters.and(...parts);
  });

  private readonly searchWords = computed(() => this.searchText().split(/\s+/).filter(Boolean));

  private matchesSearch(item: T): boolean {
    const words = this.searchWords();
    if (!words.length) return true;
    const texts = this.dataColumns()
      .filter((c) => c.searchable() && c.currentVisible())
      .map((c) => this.formatCell(c, this.cellValue(item, c)).toLocaleLowerCase());
    return words.every((w) => texts.some((t) => t.includes(w.toLocaleLowerCase())));
  }

  private providerRequest(skip: number, take: number): PbGridDataRequest {
    return {
      skip,
      take,
      sort: this.sortKeys().map((k) => ({ field: k.column.filterField, order: k.descending ? 'desc' : 'asc' })),
      filter: this.filterEnabled() ? this.userFilter() : null,
      searchText: this.searchText(),
    };
  }

  private sortKeys(): { column: PbGridColumn; descending: boolean; group: boolean }[] {
    const keys = this.groupedColumns().map((c) => ({ column: c, descending: c.currentSort() === 'desc', group: true }));
    if (this.allowSort()) keys.push(...this.sortedColumns().map((c) => ({ column: c, descending: c.currentSort() === 'desc', group: false })));
    return keys;
  }

  // ================================================================== pipeline

  protected readonly pagingActive = computed(() => this.showPager() && this.pageSize() > 0 && !this.virtualScrolling());

  private groupKey(column: PbGridColumn, item: T): unknown {
    const value = this.cellValue(item, column);
    const date = toDate(value);
    switch (column.groupInterval()) {
      case 'alphabetical':
        return value == null || value === '' ? '' : String(value).charAt(0).toLocaleUpperCase();
      case 'date':
        return date ? isoDay(date) : value;
      case 'month':
        return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : value;
      case 'year':
        return date ? date.getFullYear() : value;
      case 'custom':
        return column.groupKey()?.(value) ?? value;
      default:
        return value instanceof Date ? value.getTime() : value;
    }
  }

  private groupText(column: PbGridColumn, key: unknown, sample: T): string {
    switch (column.groupInterval()) {
      case 'month':
        return typeof key === 'string' ? formatValue(parseIsoDay(`${key}-01`), 'month', this.locale(), this.currency()) : String(key ?? '');
      case 'date':
        return typeof key === 'string' ? formatValue(parseIsoDay(key), { dateStyle: 'full' }, this.locale(), this.currency()) : String(key ?? '');
      case 'year':
      case 'alphabetical':
      case 'custom':
        return String(key ?? '');
      default: {
        const value = this.cellValue(sample, column);
        return value == null || value === '' ? '(Blank)' : this.formatCell(column, value);
      }
    }
  }

  private sortItems(items: T[]): T[] {
    const keys = this.sortKeys();
    if (!keys.length) return items;
    const decorated = items.map((item, index) => ({ item, index, values: keys.map((k) => (k.group ? this.groupKey(k.column, item) : this.cellValue(item, k.column))) }));
    decorated.sort((a, b) => {
      for (let i = 0; i < keys.length; i++) {
        const c = compareValues(a.values[i], b.values[i]);
        if (c) return keys[i].descending ? -c : c;
      }
      return a.index - b.index;
    });
    return decorated.map((d) => d.item);
  }

  private totalSummaryDefs(): SummaryDef[] {
    return [
      ...this.summaries()
        .filter((s) => !s.group() && s.visible())
        .map((s) => ({ type: s.type(), field: s.field(), footerColumn: s.footerColumn(), displayText: s.displayText(), format: s.format(), name: s.name() })),
      ...this.userSummaries(),
    ];
  }

  protected readonly showGroupFooters = computed(() => {
    const mode = this.groupFooterDisplayMode();
    return mode === 'always' || (mode === 'auto' && this.summaries().some((s) => s.group() && s.visible() && !!s.footerColumn()));
  });

  private groupSummaryDefs(footer: boolean): SummaryDef[] {
    return this.summaries()
      .filter((s) => s.group() && s.visible() && (footer ? this.showGroupFooters() && !!s.footerColumn() : !s.footerColumn() || !this.showGroupFooters()))
      .map((s) => ({ type: s.type(), field: s.field(), footerColumn: s.footerColumn(), displayText: s.displayText(), format: s.format(), name: s.name() }));
  }

  private summary(def: SummaryDef, items: readonly T[], groupKey: unknown, inGroupRow: boolean): PbGridSummaryValue {
    const column = def.field ? this.fieldColumn(def.field) : undefined;
    let value: unknown = null;
    if (def.type === 'count') value = items.length;
    else if (def.type === 'custom') {
      const handler = this.customSummary();
      if (handler) {
        const e: PbGridCustomSummaryEvent<T> = { name: def.name, field: def.field, items, groupValue: groupKey, value: null };
        handler(e);
        value = e.value;
      }
    } else if (column) {
      const values = items.map((i) => this.cellValue(i, column)).filter((v) => v != null);
      if (values.length) {
        if (def.type === 'min') value = values.reduce((a, b) => (compareValues(a, b) <= 0 ? a : b));
        else if (def.type === 'max') value = values.reduce((a, b) => (compareValues(a, b) >= 0 ? a : b));
        else {
          const sum = values.reduce<number>((a, b) => a + Number(b), 0);
          value = def.type === 'sum' ? Math.round(sum * 1e6) / 1e6 : sum / values.length;
        }
      }
    }
    return { type: def.type, field: def.field, name: def.name, value, text: this.summaryText(def, value, inGroupRow) };
  }

  private summaryText(def: SummaryDef, value: unknown, inGroupRow: boolean): string {
    const column = def.field ? this.fieldColumn(def.field) : undefined;
    let valueText = '';
    if (value != null) {
      if (def.format) valueText = formatValue(value, def.format, this.locale(), this.currency());
      else if (def.type === 'count') valueText = formatValue(value, 'integer', this.locale(), this.currency());
      else if (column?.format()) valueText = this.formatCell(column, value);
      else if (def.type === 'avg') valueText = formatValue(value, 'number', this.locale(), this.currency());
      else valueText = column ? this.formatCell(column, value) : String(value);
    }
    const typeText = def.type === 'avg' ? 'Avg' : def.type === 'custom' ? (def.name ?? 'Custom') : def.type.charAt(0).toUpperCase() + def.type.slice(1);
    const name = inGroupRow && def.type !== 'count' && def.type !== 'custom' && column ? `${typeText} of ${column.displayCaption}` : typeText;
    return def.displayText ? def.displayText.replace('{0}', name).replace('{1}', valueText) : `${name}: ${valueText}`;
  }

  private buildGroups(items: T[], level: number, parentPath: string, grouped: PbGridColumn[]): GridGroup<T>[] {
    const column = grouped[level];
    const groups: GridGroup<T>[] = [];
    const rowDefs = this.groupSummaryDefs(false);
    const footerDefs = this.groupSummaryDefs(true);
    let start = 0;
    while (start < items.length) {
      const key = this.groupKey(column, items[start]);
      let end = start + 1;
      while (end < items.length && this.groupKey(column, items[end]) === key) end++;
      const groupItems = items.slice(start, end);
      const path = `${parentPath}/${column.key}=${String(key)}`;
      groups.push({
        column,
        key,
        text: this.groupText(column, key, items[start]),
        items: groupItems,
        path,
        level,
        children: level + 1 < grouped.length ? this.buildGroups(groupItems, level + 1, path, grouped) : null,
        rowSummaries: rowDefs.map((d) => this.summary(d, groupItems, key, true)),
        footerSummaries: footerDefs.map((d) => this.summary(d, groupItems, key, false)),
      });
      start = end;
    }
    return groups;
  }

  protected isExpanded(group: GridGroup<T>): boolean {
    return this.groupExpanded().get(group.path) ?? this.expandAll() ?? this.autoExpandAllGroups();
  }

  /** Filter, sort, group and summarize (in memory) or take the provider's page. */
  protected readonly view = computed(() => {
    this.version();
    this.batchInserted();
    const tree = this.treeConfig();
    const treeModel = this.treeModel();
    if (tree && treeModel) return this.buildTreeView(tree, treeModel);
    const provider = this.dataProvider();
    const grouped = this.groupedColumns();
    const rows: GridRow<T>[] = [];
    let dataIndex = 0;
    const addData = (item: T, level: number, inserted = false) => rows.push({ kind: 'data', item, level, index: rows.length, dataIndex: dataIndex++, inserted });

    if (provider) {
      if (this.virtualScrolling()) return { rows, items: [] as T[], total: this.virtualTotal(), rowCount: this.virtualTotal(), totals: [] as PbGridSummaryValue[] };
      const result = this.providerResult()?.result;
      for (const item of result?.items ?? []) addData(item, 0);
      const total = result?.totalCount ?? 0;
      const totals = this.totalSummaryDefs()
        .filter((d) => d.type === 'count')
        .map((d) => ({ type: d.type, field: d.field, name: d.name, value: total, text: this.summaryText(d, total, false) }));
      return { rows, items: [...(result?.items ?? [])], total, rowCount: total, totals };
    }

    const filter = this.filterEnabled() ? this.userFilter() : null;
    let items = [...this.data()];
    if (filter) items = items.filter((item) => filterMatches(filter, item, this));
    if (this.searchWords().length) items = items.filter((item) => this.matchesSearch(item));
    items = this.sortItems(items);

    for (const inserted of this.batchInserted()) addData(inserted, grouped.length, true);
    if (grouped.length) {
      const showFooters = this.showGroupFooters();
      const walk = (group: GridGroup<T>) => {
        rows.push({ kind: 'group', group, level: group.level, index: rows.length, dataIndex: -1 });
        if (!this.isExpanded(group)) return;
        if (group.children) group.children.forEach(walk);
        else group.items.forEach((item) => addData(item, grouped.length));
        if (showFooters) rows.push({ kind: 'groupFooter', group, level: group.level, index: rows.length, dataIndex: -1 });
      };
      this.buildGroups(items, 0, '', grouped).forEach(walk);
    } else {
      items.forEach((item) => addData(item, 0));
    }
    const totals = this.totalSummaryDefs().map((d) => this.summary(d, items, null, false));
    return { rows, items, total: items.length, rowCount: rows.length, totals };
  });

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.view().rowCount / Math.max(1, this.pageSize()))));

  /** The page index, clamped to the existing pages. */
  protected readonly safePageIndex = computed(() => Math.min(this.pageIndex(), this.pageCount() - 1));

  protected readonly pageRows = computed(() => {
    const rows = this.view().rows;
    if (this.dataProvider() || !this.pagingActive()) return rows;
    const start = this.safePageIndex() * this.pageSize();
    return rows.slice(start, start + this.pageSize());
  });

  // ------------------------------------------------------------------ virtual scrolling

  private readonly virtualRange = computed(() => {
    const height = this.rowHeight();
    const start = Math.max(0, Math.floor(this.scrollTop() / height) - 10);
    const count = Math.ceil(this.viewportHeight() / height) + 20;
    return [start, start + count] as const;
  });

  /** Rows rendered now: the page, or the window around the scroll position. */
  protected readonly renderedRows = computed<GridRow<T>[]>(() => {
    if (!this.virtualScrolling()) return this.pageRows();
    const [start, end] = this.virtualRange();
    if (this.dataProvider()) {
      const cache = this.virtualCache();
      const rows: GridRow<T>[] = [];
      for (let i = start; i < Math.min(end, this.virtualTotal()); i++) {
        const item = cache.get(i);
        rows.push(item === undefined ? { kind: 'data', level: 0, index: i, dataIndex: i } : { kind: 'data', item, level: 0, index: i, dataIndex: i });
      }
      return rows;
    }
    return this.view().rows.slice(start, end);
  });

  protected readonly spacerTop = computed(() => (this.virtualScrolling() ? this.virtualRange()[0] * this.rowHeight() : 0));

  protected readonly spacerBottom = computed(() => {
    if (!this.virtualScrolling()) return 0;
    const total = this.dataProvider() ? this.virtualTotal() : this.view().rows.length;
    return Math.max(0, total - this.virtualRange()[1]) * this.rowHeight();
  });

  protected onScroll(event: Event): void {
    if (!this.virtualScrolling()) return;
    const element = event.target as HTMLElement;
    this.scrollTop.set(element.scrollTop);
    this.viewportHeight.set(element.clientHeight);
  }

  private async loadFromProvider(provider: (r: PbGridDataRequest) => Promise<PbGridDataResult<T>>, request: PbGridDataRequest, signature: string): Promise<void> {
    if (signature === this.providerSignature && this.providerResult()) return;
    this.providerSignature = signature;
    this.loading.set(true);
    try {
      const result = await provider(request);
      if (signature !== this.providerSignature) return;
      this.providerResult.set({ signature, result });
      if (this.pagingActive() && result.totalCount > 0 && request.skip >= result.totalCount) this.pageIndex.set(Math.ceil(result.totalCount / this.pageSize()) - 1);
    } finally {
      if (signature === this.providerSignature) this.loading.set(false);
    }
  }

  private async loadVirtualBlock(provider: (r: PbGridDataRequest) => Promise<PbGridDataResult<T>>, request: PbGridDataRequest, block: number): Promise<void> {
    const signature = this.virtualSignature;
    if (this.virtualPending.has(block)) return;
    this.virtualPending.add(block);
    this.loading.set(true);
    try {
      const result = await provider({ ...request, skip: block * 100, take: 100 });
      if (signature !== this.virtualSignature) return;
      const cache = new Map(this.virtualCache());
      result.items.forEach((item, i) => cache.set(block * 100 + i, item));
      this.virtualCache.set(cache);
      this.virtualTotal.set(result.totalCount);
    } finally {
      this.loading.set(false);
    }
  }

  /** Re-reads the data after you changed it outside the grid. */
  reload(): void {
    this.providerSignature = '';
    this.virtualSignature = '';
    this.version.update((v) => v + 1);
  }

  /** The rows after filtering and sorting (all pages). */
  getFilteredItems(): T[] {
    return [...this.view().items];
  }

  getTotalSummaryValue(name: string): unknown {
    return this.view().totals.find((t) => t.name === name || (!t.name && t.field === name))?.value;
  }

  // ================================================================== layout of the table

  protected readonly serviceColumns = computed(() => {
    const services: string[] = [];
    if (this.detailTemplate() && this.detailRowDisplayMode() === 'auto') services.push('detail');
    if (this.adaptiveColumns().length) services.push('adaptive');
    if (this.allowDragRows()) services.push('drag');
    return services;
  });

  protected readonly indentCount = computed(() => this.groupedColumns().length);
  protected readonly prefixCount = computed(() => this.indentCount() + this.serviceColumns().length);
  protected readonly totalColumns = computed(() => Math.max(1, this.prefixCount() + this.leaves().length));
  protected readonly hasLeftFixed = computed(() => this.leaves().some((c) => c.currentFixed() === 'left'));
  protected readonly indexes = (n: number) => Array.from({ length: n }, (_, i) => i);

  protected readonly headerDepth = computed(() => Math.max(1, ...this.leaves().map((c) => this.ancestors(c).length + 1)));

  protected readonly headerRows = computed(() => {
    const leaves = this.leaves();
    const offset = this.prefixCount();
    const depth = this.headerDepth();
    const rows: HeaderCell[][] = [];
    for (let level = 0; level < depth; level++) {
      const cells: HeaderCell[] = [];
      let i = 0;
      while (i < leaves.length) {
        const chain = this.ancestors(leaves[i]);
        if (level < chain.length) {
          const band = chain[level];
          let span = 1;
          while (i + span < leaves.length && this.ancestors(leaves[i + span])[level] === band) span++;
          cells.push({ column: band, colspan: span, rowspan: 1, position: offset + i, leaf: false });
          i += span;
        } else if (level === chain.length) {
          cells.push({ column: leaves[i], colspan: 1, rowspan: depth - level, position: offset + i, leaf: true });
          i++;
        } else i++;
      }
      rows.push(cells);
    }
    return rows;
  });

  protected readonly tableStyle = computed(() => {
    const leaves = this.leaves();
    const widths = leaves.map((c) => pixelWidth(c.currentWidth()));
    const service = this.indentCount() * 32 + this.serviceColumns().reduce((n, s) => n + (s === 'drag' ? 40 : 48), 0);
    if (this.columnResizeMode() === 'columnsContainer' && widths.length && widths.every((w) => w != null)) {
      return `width:${widths.reduce<number>((a, b) => a + b!, 0) + service}px`;
    }
    const minimum = service + leaves.reduce((sum, c, i) => sum + (widths[i] ?? Math.max(c.minWidth(), 120)), 0);
    return `width:100%;min-width:${minimum}px`;
  });

  protected readonly rootClass = computed(() =>
    [
      'pb-data-grid',
      `pb-data-grid--lines-${this.gridLines()}`,
      this.alternatingRows() ? 'pb-data-grid--alternating' : '',
      this.dense() ? 'pb-data-grid--dense' : '',
      this.focusedRowEnabled() ? 'pb-data-grid--focus-row' : '',
      this.allowSelectRowByClick() ? 'pb-data-grid--click-select' : '',
      this.height() ? 'pb-data-grid--fixed-height' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  protected readonly pagerOptions = computed(() => {
    const options = this.pageSizeOptions();
    return options.includes(this.pageSize()) ? options : [...options, this.pageSize()].sort((a, b) => a - b);
  });

  protected fixedClass(position: number, column: PbGridColumn | null): string {
    if (!column) return this.hasLeftFixed() ? 'pb-data-grid__cell--fixed-left' : '';
    const fixed = column.currentFixed();
    if (fixed === 'left') return this.leaves().filter((c) => c.currentFixed() === 'left').at(-1) === column ? 'pb-data-grid__cell--fixed-left pb-data-grid__cell--fixed-edge' : 'pb-data-grid__cell--fixed-left';
    if (fixed === 'right') return this.leaves().find((c) => c.currentFixed() === 'right') === column ? 'pb-data-grid__cell--fixed-right pb-data-grid__cell--fixed-edge' : 'pb-data-grid__cell--fixed-right';
    return '';
  }

  protected fixedStyle(position: number, column: PbGridColumn | null): string | null {
    if (!column) return this.hasLeftFixed() ? `inset-inline-start:var(--pbg-fl-${position},0px)` : null;
    const fixed = column.currentFixed();
    return fixed === 'left' ? `inset-inline-start:var(--pbg-fl-${position},0px)` : fixed === 'right' ? `inset-inline-end:var(--pbg-fr-${position},0px)` : null;
  }

  protected fixedAttr(column: PbGridColumn): string | null {
    const fixed: PbGridFixedPosition = column.currentFixed();
    return fixed === 'none' ? null : fixed;
  }

  protected customize(type: PbGridElementType, item: T | undefined, column: PbGridColumn | undefined, value: unknown, rowIndex: number): { cssClass: string; style: string } {
    const handler = this.customizeElement();
    if (!handler) return { cssClass: '', style: '' };
    const e: PbGridCustomizeElementEvent<T> = { type, item, field: column?.field() ?? column?.key, value, rowIndex };
    handler(e);
    return { cssClass: e.cssClass ?? '', style: e.style ?? '' };
  }

  private syncFixedColumns(): void {
    const table = this.host.querySelector(':scope > .pb-data-grid__scroll > .pb-data-grid__table') as HTMLTableElement | null;
    const cells = [...(table?.tHead?.rows[0]?.cells ?? [])];
    if (!table) return;
    let start = 0;
    cells.forEach((cell, i) => {
      if (cell.dataset['fixed'] === 'left') {
        table.style.setProperty(`--pbg-fl-${i}`, `${start}px`);
        start += cell.getBoundingClientRect().width;
      }
    });
    let end = 0;
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i].dataset['fixed'] === 'right') {
        table.style.setProperty(`--pbg-fr-${i}`, `${end}px`);
        end += cells[i].getBoundingClientRect().width;
      }
    }
  }

  protected ariaSort(column: PbGridColumn): string | null {
    const sort = column.currentSort();
    return sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : null;
  }

  protected readonly sortedCount = computed(() => this.sortedColumns().length);

  // ================================================================== cell display

  protected modelFor(row: GridRow<T>): T {
    const item = row.item!;
    if (this.editMode() === 'batch') {
      const pair = this.batchUpdated().get(this.keyOf(item));
      if (pair) return pair.clone;
    }
    // The row being edited shows (and writes to) the edit copy: validated on save, dropped on cancel.
    if (this.isEditingRow(item)) return this.editModel()!;
    return item;
  }

  protected cellContext(row: GridRow<T>, column: PbGridColumn): PbGridCellContext<T> {
    const item = this.modelFor(row);
    const value = this.cellValue(item, column);
    return { $implicit: item, item, field: column.field(), value, text: this.formatCell(column, value), rowIndex: row.index, searchText: this.searchText() };
  }

  /** Text split into search-highlighted and plain parts. */
  protected highlight(text: string): { text: string; mark: boolean }[] {
    const words = this.searchWords();
    if (!words.length || !text) return [{ text, mark: false }];
    const lower = text.toLocaleLowerCase();
    const marks = new Array<boolean>(text.length).fill(false);
    for (const word of words) {
      const w = word.toLocaleLowerCase();
      for (let i = lower.indexOf(w); i >= 0; i = lower.indexOf(w, i + w.length)) for (let k = i; k < i + w.length; k++) marks[k] = true;
    }
    const parts: { text: string; mark: boolean }[] = [];
    let i = 0;
    while (i < text.length) {
      let j = i;
      while (j < text.length && marks[j] === marks[i]) j++;
      parts.push({ text: text.slice(i, j), mark: marks[i] });
      i = j;
    }
    return parts;
  }

  protected groupContext(group: GridGroup<T>): PbGridGroupRowContext {
    const context = {
      $implicit: null as unknown as PbGridGroupRowContext,
      field: group.column.filterField,
      caption: group.column.displayCaption,
      value: group.key,
      text: group.text,
      count: group.items.length,
      summaries: group.rowSummaries.map((s) => s.text),
      level: group.level,
      expanded: this.isExpanded(group),
    };
    context.$implicit = context;
    return context;
  }

  protected groupSummaryText(group: GridGroup<T>): string {
    return group.rowSummaries.length ? group.rowSummaries.map((s) => s.text).join(', ') : `Count: ${formatValue(group.items.length, 'integer', this.locale(), this.currency())}`;
  }

  protected footerSummaries(values: PbGridSummaryValue[], column: PbGridColumn, defs: SummaryDef[]): PbGridSummaryValue[] {
    return values.filter((_, i) => {
      const target = defs[i]?.footerColumn ?? defs[i]?.field;
      return !!target && (target === column.key || target === column.field());
    });
  }

  protected readonly totalDefs = computed(() => this.totalSummaryDefs());
  protected readonly groupFooterDefs = computed(() => this.groupSummaryDefs(true));

  protected rowClass(row: GridRow<T>): string {
    const item = row.item;
    if (!item) return 'pb-data-grid__row pb-data-grid__row--placeholder';
    const custom = this.customize('dataRow', item, undefined, undefined, row.index);
    return [
      'pb-data-grid__row',
      this.isSelected(item) ? 'pb-data-grid__row--selected' : '',
      this.isFocused(item) ? 'pb-data-grid__row--focused' : '',
      row.dataIndex % 2 === 1 ? 'pb-data-grid__row--alt' : '',
      this.editMode() === 'editRow' && this.isEditingRow(item) ? 'pb-data-grid__edit-row' : '',
      this.isRowDeleted(row) ? 'pb-data-grid__row--deleted' : '',
      row.inserted ? 'pb-data-grid__row--inserted' : '',
      custom.cssClass,
    ]
      .filter(Boolean)
      .join(' ');
  }

  protected rowStyle(row: GridRow<T>): string | null {
    return row.item ? this.customize('dataRow', row.item, undefined, undefined, row.index).style || null : null;
  }

  protected cellClass(row: GridRow<T>, column: PbGridColumn, position: number): string {
    const model = this.modelFor(row);
    const custom = this.customize('dataCell', row.item, column, column.isData ? this.cellValue(model, column) : undefined, row.index);
    const editable = (this.editMode() === 'editCell' || this.editMode() === 'batch') && column.canEdit && !this.isRowDeleted(row);
    return [
      'pb-data-grid__cell',
      this.alignClass(column),
      this.fixedClass(position, column),
      column.cssClass() ?? '',
      custom.cssClass,
      this.isCellModified(row, column) ? 'pb-data-grid__cell--modified' : '',
      this.isCellEditor(row, column) ? 'pb-data-grid__cell--editing' : '',
      editable ? 'pb-data-grid__cell--editable' : '',
      this.batchMessage(row, column) ? 'pb-data-grid__cell--invalid' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  protected cellStyle(row: GridRow<T>, column: PbGridColumn, position: number): string | null {
    const custom = this.customize('dataCell', row.item, column, column.isData ? this.cellValue(this.modelFor(row), column) : undefined, row.index);
    return [this.fixedStyle(position, column), custom.style].filter(Boolean).join(';') || null;
  }

  // ================================================================== selection and focus

  private readonly selectedMap = computed(() => new Map(this.selectedItems().map((i) => [this.keyOf(i), i])));

  isSelected(item: T): boolean {
    return this.selectedMap().has(this.keyOf(item));
  }

  private setSelection(map: Map<unknown, T>): void {
    this.selectedItems.set([...map.values()]);
  }

  async selectItem(item: T, select = true): Promise<void> {
    if (this.selectionMode() === 'none') return;
    const map = this.selectionMode() === 'single' && select ? new Map<unknown, T>() : new Map(this.selectedMap());
    if (select) map.set(this.keyOf(item), item);
    else map.delete(this.keyOf(item));
    this.setSelection(map);
  }

  selectItems(items: readonly T[], select = true): void {
    const map = new Map(this.selectedMap());
    for (const item of items) {
      if (select) map.set(this.keyOf(item), item);
      else map.delete(this.keyOf(item));
    }
    this.setSelection(map);
  }

  private selectAllScope(): T[] {
    return this.selectAllMode() === 'allPages' ? this.getFilteredItems() : this.pageRows().filter((r) => r.kind === 'data' && !r.inserted && r.item).map((r) => r.item!);
  }

  selectAll(select = true): void {
    this.selectItems(this.selectAllScope(), select);
  }

  clearSelection(): void {
    this.selectedItems.set([]);
  }

  getSelectedItems(): T[] {
    return [...this.selectedItems()];
  }

  protected readonly selectAllState = computed<boolean | null>(() => {
    const scope = this.selectAllScope();
    if (!scope.length) return false;
    const count = scope.filter((i) => this.isSelected(i)).length;
    return count === 0 ? false : count === scope.length ? true : null;
  });

  protected toggleSelectAll(): void {
    this.selectAll(this.selectAllState() !== true);
  }

  protected toggleRow(item: T): void {
    if (this.treeConfig()?.recursiveSelection && this.selectionMode() === 'multiple') this.toggleTreeSelection(item);
    else void this.selectItem(item, !this.isSelected(item));
  }

  protected isFocused(item: T): boolean {
    const focused = this.focusedItem();
    return this.focusedRowEnabled() && focused != null && this.keyOf(focused) === this.keyOf(item);
  }

  protected tabIndexOf(row: GridRow<T>): number {
    const rows = this.renderedRows();
    const current = rows.some((r) => r.index === this.keyboardRow()) ? this.keyboardRow() : (rows[0]?.index ?? 0);
    return row.index === current ? 0 : -1;
  }

  protected onRowClick(row: GridRow<T>, event: MouseEvent): void {
    const item = row.item;
    if (!item) return;
    this.keyboardRow.set(row.index);
    if (this.focusedRowEnabled()) this.focusedItem.set(item);
    if (this.allowSelectRowByClick() && this.selectionMode() !== 'none') {
      const map = new Map(this.selectedMap());
      const key = this.keyOf(item);
      if (this.selectionMode() === 'single') {
        map.clear();
        map.set(key, item);
      } else if (event.shiftKey && this.selectionAnchor() != null) {
        const from = Math.min(this.selectionAnchor()!, row.index);
        const to = Math.max(this.selectionAnchor()!, row.index);
        if (!event.ctrlKey && !event.metaKey) map.clear();
        for (const r of this.view().rows) if (r.kind === 'data' && r.item && r.index >= from && r.index <= to) map.set(this.keyOf(r.item), r.item);
      } else if (event.ctrlKey || event.metaKey) {
        if (map.has(key)) map.delete(key);
        else map.set(key, item);
        this.selectionAnchor.set(row.index);
      } else {
        map.clear();
        map.set(key, item);
        this.selectionAnchor.set(row.index);
      }
      this.setSelection(map);
    }
    this.rowClick.emit(item);
  }

  protected onRowDoubleClick(row: GridRow<T>): void {
    if (!row.item) return;
    this.rowDoubleClick.emit(row.item);
    if (this.canEditRows() && this.editMode() !== 'editCell' && this.editMode() !== 'batch' && !row.inserted) void this.startEdit(row.item);
  }

  // ================================================================== sorting and grouping

  protected onHeaderClick(column: PbGridColumn, event: MouseEvent | KeyboardEvent): void {
    if (this.suppressHeaderClick) {
      this.suppressHeaderClick = false;
      return;
    }
    if (!this.allowSort() || !column.canSort) return;
    if (event.ctrlKey || event.metaKey) this.sortBy(column.key, 'none', false);
    else this.sortBy(column.key, column.currentSort() === 'asc' ? 'desc' : 'asc', !event.shiftKey);
    this.emitLayout();
  }

  protected onHeaderKeyDown(column: PbGridColumn, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onHeaderClick(column, event);
    }
  }

  /** Sorts by a column; clearOthers false adds it to the current sort (Shift+click). */
  sortBy(key: string, order: PbGridSortOrder, clearOthers = true): void {
    const target = this.getColumn(key);
    if (!target) return;
    if (target.currentGroupIndex() >= 0) {
      target.currentSort.set(order === 'none' ? 'asc' : order);
      return;
    }
    if (clearOthers) {
      for (const other of this.dataColumns()) {
        if (other !== target && other.currentGroupIndex() < 0) {
          other.currentSort.set('none');
          other.currentSortIndex.set(-1);
        }
      }
    }
    const wasSorted = target.currentSort() !== 'none';
    target.currentSort.set(order);
    if (order === 'none') target.currentSortIndex.set(-1);
    else if (!wasSorted || clearOthers) target.currentSortIndex.set(clearOthers ? 0 : this.sortedColumns().filter((c) => c !== target).length);
    this.sortedColumns().forEach((c, i) => c.currentSortIndex.set(i));
  }

  clearSort(): void {
    for (const column of this.dataColumns()) {
      if (column.currentGroupIndex() < 0) {
        column.currentSort.set('none');
        column.currentSortIndex.set(-1);
      }
    }
  }

  groupBy(key: string, index = -1): void {
    const target = this.getColumn(key);
    if (!target?.canGroup) return;
    const grouped = this.groupedColumns().filter((c) => c !== target);
    grouped.splice(index < 0 || index > grouped.length ? grouped.length : index, 0, target);
    grouped.forEach((c, i) => c.currentGroupIndex.set(i));
    if (target.currentSort() === 'none') target.currentSort.set('asc');
    this.pageIndex.set(0);
  }

  ungroup(key: string): void {
    const target = this.getColumn(key);
    if (!target) return;
    target.currentGroupIndex.set(-1);
    target.currentSort.set('none');
    this.groupedColumns().forEach((c, i) => c.currentGroupIndex.set(i));
  }

  clearGrouping(): void {
    for (const column of this.groupedColumns()) {
      column.currentGroupIndex.set(-1);
      column.currentSort.set('none');
    }
  }

  expandAllGroups(): void {
    this.groupExpanded.set(new Map());
    this.expandAll.set(true);
  }

  collapseAllGroups(): void {
    this.groupExpanded.set(new Map());
    this.expandAll.set(false);
  }

  protected toggleGroup(group: GridGroup<T>, row?: GridRow<T>): void {
    const map = new Map(this.groupExpanded());
    map.set(group.path, !this.isExpanded(group));
    this.groupExpanded.set(map);
    if (row) this.keyboardRow.set(row.index);
  }

  protected toggleGroupSort(column: PbGridColumn): void {
    this.sortBy(column.key, column.currentSort() === 'desc' ? 'asc' : 'desc');
    this.emitLayout();
  }

  protected removeGroup(column: PbGridColumn, event: Event): void {
    event.stopPropagation();
    this.ungroup(column.key);
    this.emitLayout();
  }

  // ================================================================== detail rows

  protected isDetailExpanded(item: T): boolean {
    return !!this.detailTemplate() && (this.detailRowDisplayMode() === 'always' || this.expandedDetails().has(this.keyOf(item)));
  }

  expandDetailRow(item: T): void {
    const set = this.autoCollapseDetailRow() ? new Set<unknown>() : new Set(this.expandedDetails());
    set.add(this.keyOf(item));
    this.expandedDetails.set(set);
  }

  collapseDetailRow(item: T): void {
    const set = new Set(this.expandedDetails());
    set.delete(this.keyOf(item));
    this.expandedDetails.set(set);
  }

  protected toggleDetail(item: T): void {
    if (this.expandedDetails().has(this.keyOf(item))) this.collapseDetailRow(item);
    else this.expandDetailRow(item);
  }

  protected toggleAdaptive(item: T): void {
    const set = new Set(this.expandedAdaptive());
    const key = this.keyOf(item);
    if (!set.delete(key)) set.add(key);
    this.expandedAdaptive.set(set);
  }

  // ================================================================== paging

  protected onPage(event: PbPageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    this.emitLayout();
  }

  goToPage(index: number): void {
    this.pageIndex.set(Math.max(0, Math.min(index, this.pageCount() - 1)));
  }

  // ================================================================== filtering

  protected onSearchInput(text: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchText.set(text);
      this.pageIndex.set(0);
      this.emitLayout();
    }, 300);
  }

  setSearchText(text: string): void {
    this.searchText.set(text);
    this.pageIndex.set(0);
  }

  protected onFilterRowInput(column: PbGridColumn, text: string, immediate: boolean): void {
    clearTimeout(this.filterTimer);
    const apply = () => {
      column.filterRowText.set(text || null);
      this.pageIndex.set(0);
      this.emitLayout();
    };
    if (immediate) apply();
    else this.filterTimer = setTimeout(apply, 350);
  }

  /** Replaces the filter criteria; the filter row and menus keep theirs. */
  setFilter(filter: PbGridFilter | null): void {
    this.filter.set(filter);
    this.filterEnabled.set(true);
    this.pageIndex.set(0);
    this.emitLayout();
  }

  /** Everything the user filtered by, as one filter. */
  getFilter(): PbGridFilter | null {
    return this.userFilter();
  }

  setFieldFilterValues(key: string, values: unknown[] | null): void {
    this.getColumn(key)?.filterValues.set(values);
    this.pageIndex.set(0);
  }

  /** Clears the criteria, filter row, filter menus and search. */
  clearFilter(): void {
    for (const column of this.gridColumns()) {
      column.filterRowText.set(null);
      column.filterValues.set(null);
    }
    this.searchText.set('');
    this.setFilter(null);
  }

  protected hasColumnFilter(column: PbGridColumn): boolean {
    return column.filterValues() != null || this.rowFilterOf(column) != null || filterFields(this.filter()).includes(column.filterField);
  }

  private clearColumnFilter(column: PbGridColumn): void {
    column.filterRowText.set(null);
    column.filterValues.set(null);
    this.pageIndex.set(0);
  }

  protected toggleFilterEnabled(): void {
    this.filterEnabled.update((v) => !v);
    this.pageIndex.set(0);
  }

  protected readonly showFilterPanel = computed(() => {
    const mode = this.filterPanelDisplayMode();
    return mode === 'always' || (mode === 'auto' && this.userFilter() != null);
  });

  protected readonly filterPanelText = computed(() => {
    const filter = this.userFilter();
    return filter ? filterText(filter, this.caption) : 'Create Filter';
  });

  protected filterRowInputType(column: PbGridColumn): string {
    const editor = this.editorType(column);
    return editor === 'date' ? 'date' : editor === 'number' ? 'number' : 'text';
  }

  protected optionValue(value: unknown): string {
    return value instanceof Date ? isoDay(value) : String(value ?? '');
  }

  // ================================================================== popups

  private openPopup(popup: Popup): void {
    this.removeOutsideListener();
    this.popupPositioned = false;
    this.popup.set(popup);
  }

  closePopup(): void {
    const panel = this.popupElement()?.nativeElement;
    if (panel?.matches(':popover-open')) {
      try {
        panel.hidePopover();
      } catch {
        /* already closed */
      }
    }
    this.removeOutsideListener();
    this.popup.set(null);
  }

  private removeOutsideListener(): void {
    if (!this.outsideListener) return;
    document.removeEventListener('pointerdown', this.outsideListener, true);
    window.removeEventListener('scroll', this.outsideListener, true);
    window.removeEventListener('resize', this.outsideListener);
    this.outsideListener = null;
  }

  private positionPopup(): void {
    const popup = this.popup();
    const panel = this.popupElement()?.nativeElement;
    if (!popup || !panel || this.popupPositioned) return;
    this.popupPositioned = true;
    try {
      if (!panel.matches(':popover-open')) panel.showPopover();
    } catch {
      /* not connected */
    }
    panel.style.left = '0px';
    panel.style.top = '0px';
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const left = Math.min(Math.max(8, popup.x), vw - width - 8);
    const above = popup.y + height > vh - 8;
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(above ? Math.max(8, popup.y - height) : popup.y)}px`;
    panel.style.transformOrigin = `left ${above ? 'bottom' : 'top'}`;
    panel.classList.remove('pb-data-grid__popup--pending');
    (panel.querySelector(popup.kind === 'menu' ? '[role=menuitem]:not([disabled])' : 'input') as HTMLElement | null)?.focus();
    this.outsideListener = (event: Event) => {
      if (event.type === 'scroll' && panel.contains(event.target as Node)) return;
      if (event.type === 'pointerdown' && event.composedPath().includes(panel)) return;
      this.closePopup();
    };
    document.addEventListener('pointerdown', this.outsideListener, true);
    window.addEventListener('scroll', this.outsideListener, true);
    window.addEventListener('resize', this.outsideListener);
  }

  protected async runMenuItem(item: PbGridContextMenuItem): Promise<void> {
    this.closePopup();
    await item.action();
  }

  protected onPopupKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closePopup();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || this.popup()?.kind !== 'menu') return;
    event.preventDefault();
    const items = [...(this.popupElement()?.nativeElement.querySelectorAll<HTMLElement>('[role=menuitem]:not([disabled])') ?? [])];
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowUp' ? (current <= 0 ? items.length - 1 : current - 1) : current >= items.length - 1 ? 0 : current + 1;
    items[next]?.focus();
  }

  protected openOperatorMenu(column: PbGridColumn, event: MouseEvent): void {
    const current = column.filterRowOperator() ?? this.defaultOperator(column);
    const items = operatorsFor(this.columnType(column)).map<PbGridContextMenuItem>((op) => ({
      text: OPERATOR_TEXT[op],
      icon: op === current ? 'check' : undefined,
      action: () => {
        column.filterRowOperator.set(op);
        this.pageIndex.set(0);
        this.emitLayout();
      },
    }));
    this.openPopup({ kind: 'menu', x: event.clientX, y: event.clientY, items });
  }

  protected openFilterMenu(column: PbGridColumn, event: MouseEvent): void {
    event.stopPropagation();
    const seen = new Map<string, unknown>();
    for (const item of this.data()) {
      let value = this.cellValue(item, column);
      if (value instanceof Date) value = new Date(value.getFullYear(), value.getMonth(), value.getDate());
      const key = value instanceof Date ? `d${value.getTime()}` : `${typeof value}:${String(value)}`;
      if (!seen.has(key)) seen.set(key, value);
      if (seen.size >= 1000) break;
    }
    const current = column.filterValues();
    this.filterMenuValues.set(
      [...seen.values()]
        .sort(compareValues)
        .map((value) => ({
          value,
          text: value == null || value === '' ? '(Blank)' : this.formatCell(column, value),
          checked: !current || current.some((c) => sameValue(value, c)),
        })),
    );
    this.filterMenuSearch.set('');
    this.openPopup({ kind: 'filter', x: event.clientX, y: event.clientY, items: [], column });
  }

  protected readonly visibleFilterValues = computed(() => {
    const search = this.filterMenuSearch().toLocaleLowerCase();
    return search ? this.filterMenuValues().filter((v) => v.text.toLocaleLowerCase().includes(search)) : this.filterMenuValues();
  });

  protected readonly filterMenuAllState = computed<boolean | null>(() => {
    const visible = this.visibleFilterValues();
    if (!visible.length) return false;
    const count = visible.filter((v) => v.checked).length;
    return count === 0 ? false : count === visible.length ? true : null;
  });

  protected toggleFilterMenuAll(): void {
    const check = this.filterMenuAllState() !== true;
    const visible = new Set(this.visibleFilterValues());
    this.filterMenuValues.update((values) => values.map((v) => (visible.has(v) ? { ...v, checked: check } : v)));
  }

  protected toggleFilterMenuValue(value: FilterMenuValue): void {
    this.filterMenuValues.update((values) => values.map((v) => (v === value ? { ...v, checked: !v.checked } : v)));
  }

  protected readonly filterMenuNoneChecked = computed(() => this.filterMenuValues().every((v) => !v.checked));

  protected applyFilterMenu(): void {
    const column = this.popup()?.column;
    if (column) {
      const values = this.filterMenuValues();
      column.filterValues.set(values.every((v) => v.checked) ? null : values.filter((v) => v.checked).map((v) => v.value));
      this.pageIndex.set(0);
    }
    this.closePopup();
    this.emitLayout();
  }

  // ------------------------------------------------------------------ context menus

  private menuEnabled(target: PbGridContextMenuTarget): boolean {
    const setting = this.contextMenus();
    if (setting === 'all') return true;
    return (typeof setting === 'string' ? setting.split(/[\s,|]+/) : setting).includes(target);
  }

  protected onHeaderContextMenu(column: PbGridColumn, event: MouseEvent): void {
    if (!this.menuEnabled('header')) return;
    event.preventDefault();
    const items: PbGridContextMenuItem[] = [];
    const run = (action: () => void) => () => {
      action();
      this.emitLayout();
    };
    if (column.canSort && this.allowSort()) {
      items.push({ text: 'Sort Ascending', icon: 'arrow-up', disabled: column.currentSort() === 'asc', action: run(() => this.sortBy(column.key, 'asc')) });
      items.push({ text: 'Sort Descending', icon: 'arrow-down', disabled: column.currentSort() === 'desc', action: run(() => this.sortBy(column.key, 'desc')) });
      items.push({ text: 'Clear Sorting', disabled: column.currentSort() === 'none' || column.currentGroupIndex() >= 0, action: run(() => this.sortBy(column.key, 'none')) });
    }
    if (column.canGroup && this.allowGroup()) {
      items.push(
        column.currentGroupIndex() >= 0
          ? { text: 'Ungroup', icon: 'layer-single', beginGroup: true, action: run(() => this.ungroup(column.key)) }
          : { text: 'Group by This Column', icon: 'layers-three-01', beginGroup: true, action: run(() => this.groupBy(column.key)) },
      );
      items.push({ text: this.groupPanelVisible() ? 'Hide Group Panel' : 'Show Group Panel', action: run(() => this.groupPanelVisible.update((v) => !v)) });
    }
    items.push({ text: 'Hide Column', icon: 'eye-off', beginGroup: true, disabled: this.leaves().length <= 1, action: run(() => this.setColumnVisible(column.key, false)) });
    items.push({ text: 'Column Chooser', icon: 'columns-03', action: () => this.showColumnChooser() });
    if (column.currentFixed() === 'none') {
      items.push({ text: 'Fix Column to the Left', icon: 'pin-02', action: run(() => this.setColumnFixed(column.key, 'left')) });
      items.push({ text: 'Fix Column to the Right', action: run(() => this.setColumnFixed(column.key, 'right')) });
    } else {
      items.push({ text: 'Unfix Column', icon: 'pin-02', action: run(() => this.setColumnFixed(column.key, 'none')) });
    }
    if (column.canFilter) {
      items.push({ text: 'Clear Filter', icon: 'filter-funnel-02', beginGroup: true, disabled: !this.hasColumnFilter(column), action: run(() => this.clearColumnFilter(column)) });
      items.push({ text: this.filterRowVisible() ? 'Hide Filter Row' : 'Show Filter Row', action: run(() => this.filterRowVisible.update((v) => !v)) });
    }
    this.openContextMenu('header', column, undefined, items, event);
  }

  protected onRowContextMenu(row: GridRow<T>, event: MouseEvent): void {
    if (!this.menuEnabled('dataRow') || !row.item) return;
    event.preventDefault();
    const item = row.item;
    const items: PbGridContextMenuItem[] = [];
    if (this.canEditRows()) {
      items.push({ text: 'New Row', icon: 'plus', action: () => this.startNewRow() });
      items.push({ text: 'Edit Row', icon: 'edit-02', disabled: !!row.inserted, action: () => this.startEdit(item) });
      items.push({ text: 'Delete Row', icon: 'trash-01', action: () => this.showDeleteConfirmation(item) });
    }
    if (this.detailTemplate() && this.detailRowDisplayMode() === 'auto') {
      items.push(
        this.isDetailExpanded(item)
          ? { text: 'Collapse Detail Row', icon: 'chevron-up', beginGroup: items.length > 0, action: () => this.collapseDetailRow(item) }
          : { text: 'Expand Detail Row', icon: 'chevron-down', beginGroup: items.length > 0, action: () => this.expandDetailRow(item) },
      );
    }
    if (this.selectionMode() !== 'none') {
      items.push({ text: this.isSelected(item) ? 'Deselect Row' : 'Select Row', icon: 'check-square', beginGroup: items.length > 0, action: () => this.toggleRow(item) });
    }
    if (this.isTree()) {
      if (this.canEditRows() && !row.inserted) items.splice(Math.min(1, items.length), 0, { text: 'New Child Row', icon: 'corner-down-right', action: () => this.startNewChildRow(item) });
      if (row.treeHasChildren) {
        items.push(
          row.treeExpanded
            ? { text: 'Collapse', icon: 'chevron-up', beginGroup: true, action: () => this.collapseRow(item) }
            : { text: 'Expand', icon: 'chevron-down', beginGroup: true, action: () => this.expandRow(item) },
        );
      }
      items.push({ text: 'Expand All', icon: 'chevron-selector-vertical', beginGroup: !row.treeHasChildren, action: () => this.expandAllRows() });
      items.push({ text: 'Collapse All', icon: 'chevron-selector-vertical', action: () => this.collapseAllRows() });
    }
    if (this.groupedColumns().length) {
      items.push({ text: 'Expand All Groups', icon: 'chevron-selector-vertical', beginGroup: true, action: () => this.expandAllGroups() });
      items.push({ text: 'Collapse All Groups', icon: 'chevron-selector-vertical', action: () => this.collapseAllGroups() });
    }
    this.openContextMenu('dataRow', undefined, item, items, event);
  }

  protected onGroupPanelContextMenu(event: MouseEvent): void {
    if (!this.menuEnabled('groupPanel')) return;
    event.preventDefault();
    const none = this.groupedColumns().length === 0;
    this.openContextMenu(
      'groupPanel',
      undefined,
      undefined,
      [
        { text: 'Expand All', icon: 'chevron-selector-vertical', disabled: none, action: () => this.expandAllGroups() },
        { text: 'Collapse All', icon: 'chevron-selector-vertical', disabled: none, action: () => this.collapseAllGroups() },
        { text: 'Clear Grouping', icon: 'layer-single', beginGroup: true, disabled: none, action: () => (this.clearGrouping(), this.emitLayout()) },
        { text: 'Hide Group Panel', action: () => this.groupPanelVisible.set(false) },
      ],
      event,
    );
  }

  protected onFooterContextMenu(column: PbGridColumn, event: MouseEvent): void {
    if (!this.menuEnabled('footer') || !column.isData) return;
    event.preventDefault();
    const field = column.filterField;
    const types: PbGridSummaryType[] = this.columnType(column) === 'number' ? ['count', 'sum', 'min', 'max', 'avg'] : ['count', 'min', 'max'];
    const items = types.map<PbGridContextMenuItem>((type) => ({
      text: type === 'avg' ? 'Average' : type.charAt(0).toUpperCase() + type.slice(1),
      icon: this.userSummaries().some((s) => s.field === field && s.type === type) ? 'check' : undefined,
      action: () => this.toggleUserSummary(field, column.key, type),
    }));
    items.push({
      text: 'Clear Summary',
      icon: 'x-close',
      beginGroup: true,
      disabled: !this.userSummaries().some((s) => s.field === field),
      action: () => this.userSummaries.update((list) => list.filter((s) => s.field !== field)),
    });
    this.openContextMenu('footer', column, undefined, items, event);
  }

  private toggleUserSummary(field: string, key: string, type: PbGridSummaryType): void {
    this.userSummaries.update((list) =>
      list.some((s) => s.field === field && s.type === type) ? list.filter((s) => !(s.field === field && s.type === type)) : [...list, { type, field, footerColumn: key }],
    );
  }

  private openContextMenu(target: PbGridContextMenuTarget, column: PbGridColumn | undefined, item: T | undefined, items: PbGridContextMenuItem[], event: MouseEvent): void {
    const e: PbGridContextMenuEvent<T> = { target, field: column?.field() ?? column?.key, item, items };
    this.customizeContextMenu()?.(e);
    if (e.items.length) this.openPopup({ kind: 'menu', x: event.clientX, y: event.clientY, items: e.items });
  }

  // ================================================================== columns: visibility, order, fixing, widths

  setColumnVisible(key: string, visible: boolean): void {
    this.getColumn(key)?.currentVisible.set(visible);
  }

  setColumnFixed(key: string, position: PbGridFixedPosition): void {
    this.getColumn(key)?.currentFixed.set(position);
  }

  setColumnWidth(key: string, width: string | null): void {
    this.getColumn(key)?.currentWidth.set(width);
  }

  /** Moves a column before or after another column with the same parent band. */
  moveColumn(key: string, targetKey: string, after: boolean): void {
    let moving = this.getColumn(key);
    let anchor = this.getColumn(targetKey);
    if (!moving || !anchor || moving === anchor) return;
    const inside = (column: PbGridColumn, band: PbGridColumn) => this.ancestors(column).includes(band);
    while (this.bandOf(moving) !== this.bandOf(anchor) && this.bandOf(anchor) && !inside(moving, this.bandOf(anchor)!)) anchor = this.bandOf(anchor)!;
    while (this.bandOf(moving) !== this.bandOf(anchor) && this.bandOf(moving)) moving = this.bandOf(moving)!;
    if (this.bandOf(moving) !== this.bandOf(anchor) || moving === anchor) return;
    const siblings = this.siblingsOf(this.bandOf(moving)).filter((c) => c !== moving);
    siblings.splice(siblings.indexOf(anchor) + (after ? 1 : 0), 0, moving);
    siblings.forEach((c, i) => c.currentVisibleIndex.set(i));
  }

  /** Fits every column to its content. */
  autoFitColumns(): void {
    const table = this.host.querySelector(':scope > .pb-data-grid__scroll > .pb-data-grid__table') as HTMLTableElement | null;
    if (!table) return;
    const cols = [...table.querySelectorAll<HTMLElement>(':scope > colgroup > col')];
    const saved = cols.map((c) => c.style.width);
    const savedWidth = table.style.width;
    cols.forEach((c) => {
      if (c.dataset['colKey']) c.style.width = '';
    });
    this.host.classList.add('pb-data-grid--measuring');
    table.style.width = 'max-content';
    const widths = new Map<string, number>();
    for (const cell of table.tHead?.rows[0]?.cells ?? []) {
      const key = cell.dataset['colKey'];
      if (key) widths.set(key, Math.max(Number(cell.dataset['minWidth'] || 40), Math.ceil(cell.getBoundingClientRect().width + 1)));
    }
    this.host.classList.remove('pb-data-grid--measuring');
    table.style.width = savedWidth;
    cols.forEach((c, i) => (c.style.width = saved[i]));
    widths.forEach((width, key) => this.getColumn(key)?.currentWidth.set(`${width}px`));
    this.emitLayout();
  }

  // ------------------------------------------------------------------ column chooser

  showColumnChooser(): void {
    this.columnChooserOpen.set(true);
  }

  protected readonly chooserColumns = computed(() => {
    const result: { column: PbGridColumn; depth: number }[] = [];
    const walk = (band: PbGridColumn | null, depth: number) => {
      for (const column of this.siblingsOf(band)) {
        if (!column.showInColumnChooser()) continue;
        result.push({ column, depth });
        if (column.kind === 'band') walk(column, depth + 1);
      }
    };
    walk(null, 0);
    return result;
  });

  protected chooserCaption(column: PbGridColumn): string {
    return column.displayCaption || (column.kind === 'selection' ? 'Selection' : column.kind === 'command' ? 'Commands' : column.key);
  }

  protected toggleChooserColumn(column: PbGridColumn): void {
    column.currentVisible.update((v) => !v);
    this.emitLayout();
  }

  protected moveChooserColumn(column: PbGridColumn, delta: number): void {
    const siblings = this.siblingsOf(this.bandOf(column));
    const target = siblings[siblings.indexOf(column) + delta];
    if (!target) return;
    this.moveColumn(column.key, target.key, delta > 0);
    this.emitLayout();
  }

  protected onChooserDragStart(column: PbGridColumn, event: DragEvent): void {
    this.chooserDragged = column;
    event.dataTransfer?.setData('text/plain', column.key);
  }

  protected onChooserDrop(target: PbGridColumn, event: DragEvent): void {
    event.preventDefault();
    const dragged = this.chooserDragged;
    this.chooserDragged = null;
    if (!dragged || dragged === target || this.bandOf(dragged) !== this.bandOf(target)) return;
    const siblings = this.siblingsOf(this.bandOf(target));
    this.moveColumn(dragged.key, target.key, siblings.indexOf(dragged) < siblings.indexOf(target));
    this.emitLayout();
  }

  // ------------------------------------------------------------------ filter builder

  private newGroupNode(or = false): FilterNode {
    return { group: true, or, children: [], field: '', operator: 'equals', value: '' };
  }

  showFilterBuilder(): void {
    let root = this.toNode(this.userFilter());
    if (!root.group) root = { ...this.newGroupNode(), children: [root] };
    this.filterBuilderRoot.set(root);
    this.filterBuilderOpen.set(true);
  }

  private toNode(filter: PbGridFilter | null): FilterNode {
    if (!filter) return this.newGroupNode();
    if (filter.kind === 'group') return { ...this.newGroupNode(filter.or), children: filter.filters.map((f) => this.toNode(f)) };
    if (filter.kind === 'in') {
      return {
        ...this.newGroupNode(true),
        children: filter.values.map((v) => ({ ...this.newGroupNode(), group: false, field: filter.field, operator: v == null ? 'blank' : 'equals', value: this.nodeValue(v) })),
      };
    }
    return { ...this.newGroupNode(), group: false, field: filter.field, operator: filter.operator, value: this.nodeValue(filter.value) };
  }

  private nodeValue(value: unknown): string {
    return value instanceof Date ? isoDay(value) : value == null ? '' : String(value);
  }

  private toFilter(node: FilterNode): PbGridFilter | null {
    if (node.group) {
      const parts = node.children.map((c) => this.toFilter(c));
      return node.or ? PbGridFilters.or(...parts) : PbGridFilters.and(...parts);
    }
    if (!node.field) return null;
    if (node.operator === 'blank' || node.operator === 'notBlank') return PbGridFilters.condition(node.field, node.operator);
    if (node.value === '') return null;
    const type = this.type(node.field);
    const parsed = type === 'date' || type === 'number' || type === 'boolean' ? tryConvert(node.value, type) : { ok: false, value: null };
    return PbGridFilters.condition(node.field, node.operator, parsed.ok ? parsed.value : node.value);
  }

  protected readonly filterableColumns = computed(() => this.orderedLeaves().filter((c) => c.canFilter));

  protected touchBuilder(): void {
    this.fbVersion.update((v) => v + 1);
  }

  protected addCondition(group: FilterNode): void {
    const column = this.filterableColumns()[0];
    if (!column) return;
    group.children.push({ ...this.newGroupNode(), group: false, field: column.filterField, operator: this.defaultOperator(column) });
    this.touchBuilder();
  }

  protected addGroup(group: FilterNode): void {
    group.children.push(this.newGroupNode());
    this.touchBuilder();
  }

  protected removeNode(parent: FilterNode, node: FilterNode): void {
    parent.children.splice(parent.children.indexOf(node), 1);
    this.touchBuilder();
  }

  protected setGroupLogic(group: FilterNode, value: string): void {
    group.or = value === 'or';
    this.touchBuilder();
  }

  protected setNodeField(node: FilterNode, field: string): void {
    node.field = field;
    node.value = '';
    const operators = operatorsFor(this.type(field));
    if (!operators.includes(node.operator)) node.operator = operators[0];
    this.touchBuilder();
  }

  protected setNodeOperator(node: FilterNode, operator: string): void {
    node.operator = operator as PbGridFilterOperator;
    this.touchBuilder();
  }

  protected setNodeValue(node: FilterNode, value: string): void {
    node.value = value;
    this.touchBuilder();
  }

  protected nodeOperators(node: FilterNode): PbGridFilterOperator[] {
    return operatorsFor(node.field ? this.type(node.field) : 'string');
  }

  protected nodeColumn(node: FilterNode): PbGridColumn | undefined {
    return node.field ? this.fieldColumn(node.field) : undefined;
  }

  protected applyFilterBuilder(): void {
    for (const column of this.gridColumns()) {
      column.filterRowText.set(null);
      column.filterValues.set(null);
    }
    this.filterBuilderOpen.set(false);
    this.setFilter(this.toFilter(this.filterBuilderRoot()));
  }

  // ================================================================== editing

  protected readonly canEditRows = computed(
    () =>
      this.editingEnabled() ||
      !!this.editSaving() ||
      !!this.batchSaving() ||
      this.editMode() === 'editCell' ||
      this.editMode() === 'batch' ||
      this.gridColumns().some((c) => c.kind === 'command') ||
      this.newItemRowPosition() !== 'disabled',
  );

  get isEditing(): boolean {
    return this.editModel() != null;
  }

  protected readonly isEditingNewRow = computed(() => this.editModel() != null && this.editIsNew());

  protected isEditingRow(item: T): boolean {
    const editing = this.editItem();
    return this.editModel() != null && !this.editIsNew() && editing != null && this.keyOf(editing) === this.keyOf(item);
  }

  private newItem(): T {
    return this.createItem()?.() ?? ({} as T);
  }

  /** Opens the editor for an item (the edit model is a copy until Save). */
  async startEdit(item: T, cell: string | null = null): Promise<void> {
    if (this.editMode() === 'batch') return;
    if (this.editModel()) this.cancelEdit();
    const e = { editModel: cloneItem(item), dataItem: item, isNew: false };
    this.customizeEditModel()?.(e);
    this.editItem.set(item);
    this.editIsNew.set(false);
    this.editModel.set(e.editModel);
    this.editCell.set(cell);
    this.editErrors.set({});
    this.popupEditOpen.set(this.editMode() === 'popupEditForm');
    this.focusEditorAfterRender = true;
  }

  /** Opens the editor for a new row (a pending row in batch mode). */
  async startNewRow(): Promise<void> {
    this.newRowParent.set(null);
    await this.startNewRowCore();
  }

  private async startNewRowCore(): Promise<void> {
    const parent = this.newRowParent();
    const e = { editModel: this.newItem(), dataItem: null as T | null, isNew: true, parentDataItem: parent };
    this.attachToParent(e.editModel);
    this.customizeEditModel()?.(e);
    this.attachToParent(e.editModel);
    if (this.editMode() === 'batch') {
      this.batchInserted.update((list) => [e.editModel, ...list]);
      const first = this.leaves().find((c) => c.canEdit);
      this.batchCell.set({ key: this.keyOf(e.editModel), column: first?.key ?? '' });
      this.pageIndex.set(0);
      this.focusEditorAfterRender = true;
      return;
    }
    if (this.editModel()) this.cancelEdit();
    this.editItem.set(null);
    this.editIsNew.set(true);
    this.editModel.set(e.editModel);
    this.editCell.set(null);
    this.editErrors.set({});
    this.popupEditOpen.set(this.editMode() === 'popupEditForm');
    this.focusEditorAfterRender = true;
  }

  private validate(model: T): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    for (const column of this.dataColumns()) {
      if (!column.canEdit) continue;
      const messages = this.validateValue(column, this.cellValue(model, column), model);
      if (messages.length) errors[column.key] = messages;
    }
    const extra = this.validateItem()?.(model);
    for (const [field, message] of Object.entries(extra ?? {})) {
      const key = this.fieldColumn(field)?.key ?? field;
      (errors[key] ??= []).push(message);
    }
    return errors;
  }

  private validateValue(column: PbGridColumn, value: unknown, item: T): string[] {
    const messages: string[] = [];
    const caption = column.displayCaption;
    if (column.required() && (value == null || value === '')) messages.push(`${caption} is required.`);
    if (typeof value === 'number') {
      const min = column.min();
      const max = column.max();
      if (min != null && value < min) messages.push(`${caption} must be at least ${min}.`);
      if (max != null && value > max) messages.push(`${caption} must be at most ${max}.`);
    }
    if (typeof value === 'string') {
      const maxLength = column.maxLength();
      if (maxLength != null && value.length > maxLength) messages.push(`${caption} must be at most ${maxLength} characters.`);
      const pattern = column.pattern();
      if (pattern && value && !pattern.test(value)) messages.push(`${caption} is not valid.`);
    }
    const custom = column.validate()?.(value, item);
    if (custom) messages.push(custom);
    return messages;
  }

  /** Validates and saves the current edit (or every batch change). False when invalid or cancelled. */
  async saveChanges(): Promise<boolean> {
    if (this.editMode() === 'batch') return this.saveBatch();
    const model = this.editModel();
    if (model == null) return true;
    const parse = this.editErrors();
    const errors = this.validate(model);
    for (const [key, messages] of Object.entries(parse)) if (messages.some((m) => m.startsWith("'"))) errors[key] = [...(errors[key] ?? []), ...messages.filter((m) => m.startsWith("'"))];
    if (Object.keys(errors).length) {
      this.editErrors.set(errors);
      return false;
    }
    const e: PbGridEditSavingEvent<T> = { editModel: model, dataItem: this.editItem(), isNew: this.editIsNew(), cancel: false, parentDataItem: this.editIsNew() ? this.newRowParent() : null };
    const handler = this.editSaving();
    if (handler) await handler(e);
    else if (e.isNew) {
      if (!this.addToParentChildren(model)) (this.data() as T[]).push(model);
    }
    else if (e.dataItem) copyInto(model, e.dataItem);
    if (e.cancel) return false;
    this.endEdit();
    this.version.update((v) => v + 1);
    this.saved.emit(model);
    return true;
  }

  /** Closes the editor without saving (batch mode: drops every pending change). */
  cancelEdit(): void {
    if (this.editMode() === 'batch') {
      this.batchUpdated.set(new Map());
      this.batchInserted.set([]);
      this.batchDeleted.set(new Map());
      this.batchErrors.set(new Map());
      this.batchCell.set(null);
      return;
    }
    this.endEdit();
  }

  private endEdit(): void {
    const model = this.editModel();
    if (model) this.newRowParents.delete(model);
    this.newRowParent.set(null);
    this.editModel.set(null);
    this.editItem.set(null);
    this.editCell.set(null);
    this.editIsNew.set(false);
    this.editErrors.set({});
    this.popupEditOpen.set(false);
  }

  protected onPopupEditOpenChange(open: boolean): void {
    if (!open && this.editModel()) this.cancelEdit();
  }

  /** Asks the user to confirm, then deletes (immediately when confirmDelete is off). */
  async showDeleteConfirmation(item: T): Promise<void> {
    if (!this.confirmDelete() || this.editMode() === 'batch') {
      await this.deleteItem(item);
      return;
    }
    this.pendingDelete.set(item);
    this.deleteDialogOpen.set(true);
  }

  protected async confirmPendingDelete(confirmed: boolean): Promise<void> {
    const item = this.pendingDelete();
    this.deleteDialogOpen.set(false);
    this.pendingDelete.set(null);
    if (confirmed && item != null) await this.deleteItem(item);
  }

  async deleteItem(item: T): Promise<void> {
    const key = this.keyOf(item);
    if (this.editMode() === 'batch') {
      if (this.batchInserted().includes(item)) this.batchInserted.update((list) => list.filter((i) => i !== item));
      else this.batchDeleted.update((map) => new Map(map).set(key, item));
      this.batchUpdated.update((map) => {
        const copy = new Map(map);
        copy.delete(key);
        return copy;
      });
      return;
    }
    const e: PbGridItemDeletingEvent<T> = { dataItem: item, cancel: false };
    const handler = this.itemDeleting();
    if (handler) await handler(e);
    else {
      const list = this.data() as T[];
      const index = list.indexOf(item);
      if (index >= 0) list.splice(index, 1);
    }
    if (e.cancel) return;
    if (this.isSelected(item)) void this.selectItem(item, false);
    if (this.isEditingRow(item)) this.endEdit();
    this.version.update((v) => v + 1);
  }

  // ------------------------------------------------------------------ editor values

  protected editErrorsFor(model: T, column: PbGridColumn): string[] {
    this.editTick();
    if (this.editMode() === 'batch') {
      const message = this.batchErrors().get(`${String(this.keyOf(model))}|${column.key}`);
      return message ? [message] : [];
    }
    return model === this.editModel() ? (this.editErrors()[column.key] ?? []) : [];
  }

  protected setEditValue(model: T, column: PbGridColumn, raw: unknown): void {
    const field = column.field();
    if (!field) return;
    const type = this.columnType(column);
    let value: unknown = raw;
    try {
      value = type === 'enum' ? (raw === '' ? null : raw) : convertTo(raw, type);
    } catch {
      this.setFieldError(model, column, [`'${String(raw)}' is not a valid ${column.displayCaption.toLowerCase()}.`]);
      return;
    }
    setField(model, field, value);
    // Re-validate the field as the user types, like DataAnnotationsValidator.
    this.setFieldError(model, column, this.validateValue(column, value, model));
    if (this.editMode() === 'batch') this.batchUpdated.update((map) => new Map(map));
    this.editTick.update((v) => v + 1);
  }

  private setFieldError(model: T, column: PbGridColumn, messages: string[]): void {
    if (this.editMode() === 'batch') {
      this.batchErrors.update((map) => {
        const copy = new Map(map);
        const key = `${String(this.keyOf(model))}|${column.key}`;
        if (messages.length) copy.set(key, messages[0]);
        else copy.delete(key);
        return copy;
      });
      return;
    }
    if (model !== this.editModel()) return;
    this.editErrors.update((errors) => {
      const copy = { ...errors };
      if (messages.length) copy[column.key] = messages;
      else delete copy[column.key];
      return copy;
    });
  }

  protected onEditorChange(model: T, column: PbGridColumn, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (target instanceof HTMLSelectElement) {
      const match = this.comboItems(column).find((v) => this.optionValue(v) === target.value);
      this.setEditValue(model, column, target.value === '' ? null : (match ?? target.value));
      return;
    }
    this.setEditValue(model, column, target.value);
  }

  protected editorText(model: T, column: PbGridColumn): string {
    this.editTick();
    const value = this.cellValue(model, column);
    if (value == null) return '';
    if (value instanceof Date) return isoDay(value);
    return String(value);
  }

  protected editContext(model: T, column: PbGridColumn): PbGridEditContext<T> {
    return {
      $implicit: model,
      item: model,
      field: column.filterField,
      value: this.cellValue(model, column),
      isNew: this.editIsNew(),
      errors: this.editErrorsFor(model, column),
      setValue: (value: unknown) => this.setEditValue(model, column, value),
    };
  }

  protected editFormContext(): PbGridEditFormContext<T> {
    const model = this.editModel()!;
    return {
      $implicit: model,
      item: model,
      isNew: this.editIsNew(),
      errors: this.editErrors(),
      setValue: (field: string, value: unknown) => {
        const column = this.getColumn(field);
        if (column) this.setEditValue(model, column, value);
      },
    };
  }

  protected readonly formColumns = computed(() => this.orderedLeaves().filter((c) => c.isData && c.currentVisible()));
  protected readonly firstEditable = computed(() => this.leaves().find((c) => c.canEdit) ?? null);
  protected readonly firstFormEditable = computed(() => this.formColumns().find((c) => c.canEdit) ?? null);

  protected async onEditorKeyDown(event: KeyboardEvent): Promise<void> {
    event.stopPropagation();
    if (event.key === 'Escape') {
      if (this.editMode() === 'batch') this.batchCell.set(null);
      else this.cancelEdit();
    } else if (event.key === 'Enter' && !(event.target instanceof HTMLTextAreaElement)) {
      (event.target as HTMLElement).dispatchEvent(new Event('change', { bubbles: true }));
      if (this.editMode() === 'editRow' || this.editMode() === 'editCell') await this.saveChanges();
      else if (this.editMode() === 'batch') this.batchCell.set(null);
    }
  }

  // ------------------------------------------------------------------ cell editing (editCell and batch)

  protected isCellEditor(row: GridRow<T>, column: PbGridColumn): boolean {
    if (!column.canEdit || !row.item || this.isRowDeleted(row)) return false;
    switch (this.editMode()) {
      case 'editRow':
        return this.isEditingRow(row.item);
      case 'editCell':
        return this.isEditingRow(row.item) && this.editCell() === column.key;
      case 'batch': {
        const cell = this.batchCell();
        return !!cell && cell.key === this.keyOf(row.item) && cell.column === column.key;
      }
      default:
        return false;
    }
  }

  protected async onCellClick(row: GridRow<T>, column: PbGridColumn): Promise<void> {
    if (!column.canEdit || !row.item) return;
    const item = row.item;
    if (this.editMode() === 'editCell') {
      if (this.isEditingRow(item)) {
        this.editCell.set(column.key);
        this.focusEditorAfterRender = true;
        return;
      }
      if (this.editModel() && !(await this.saveChanges())) return;
      await this.startEdit(item, column.key);
    } else if (this.editMode() === 'batch') {
      const key = this.keyOf(item);
      if (this.batchDeleted().has(key)) return;
      if (!row.inserted && !this.batchUpdated().has(key)) this.batchUpdated.update((map) => new Map(map).set(key, { original: item, clone: cloneItem(item) }));
      this.batchCell.set({ key, column: column.key });
      this.focusEditorAfterRender = true;
    }
  }

  protected async onCellEditorFocusOut(event: FocusEvent): Promise<void> {
    const cell = event.currentTarget as HTMLElement;
    if (cell.contains(event.relatedTarget as Node)) return;
    if (this.editMode() === 'editCell' && this.editModel() && !this.editIsNew()) await this.saveChanges();
  }

  protected isCellModified(row: GridRow<T>, column: PbGridColumn): boolean {
    if (this.editMode() !== 'batch' || !row.item) return false;
    const pair = this.batchUpdated().get(this.keyOf(row.item));
    return !!pair && !sameValue(this.cellValue(pair.original, column), this.cellValue(pair.clone, column));
  }

  protected isRowDeleted(row: GridRow<T>): boolean {
    return this.editMode() === 'batch' && !!row.item && this.batchDeleted().has(this.keyOf(row.item));
  }

  protected batchMessage(row: GridRow<T>, column: PbGridColumn): string | null {
    if (this.editMode() !== 'batch' || !row.item) return null;
    return this.batchErrors().get(`${String(this.keyOf(row.item))}|${column.key}`) ?? null;
  }

  private changedPairs(): { original: T; clone: T }[] {
    return [...this.batchUpdated().values()].filter((p) => this.dataColumns().some((c) => !sameValue(this.cellValue(p.original, c), this.cellValue(p.clone, c))));
  }

  protected readonly batchSummary = computed(() => {
    this.editTick();
    const parts: string[] = [];
    const updated = this.changedPairs().length;
    if (updated) parts.push(`${updated} modified`);
    if (this.batchInserted().length) parts.push(`${this.batchInserted().length} new`);
    if (this.batchDeleted().size) parts.push(`${this.batchDeleted().size} deleted`);
    return parts.join(', ');
  });

  protected restoreRow(item: T): void {
    this.batchDeleted.update((map) => {
      const copy = new Map(map);
      copy.delete(this.keyOf(item));
      return copy;
    });
  }

  private async saveBatch(): Promise<boolean> {
    const updated = this.changedPairs();
    const errors = new Map<string, string>();
    for (const model of [...updated.map((p) => p.clone), ...this.batchInserted()]) {
      for (const [key, messages] of Object.entries(this.validate(model))) errors.set(`${String(this.keyOf(model))}|${key}`, messages[0]);
    }
    if (errors.size) {
      this.batchErrors.set(errors);
      return false;
    }
    const changes: PbGridBatchChanges<T> = {
      updated: updated.map((p) => ({ dataItem: p.original, editModel: p.clone })),
      inserted: [...this.batchInserted()],
      deleted: [...this.batchDeleted().values()],
    };
    const handler = this.batchSaving();
    if (handler) await handler(changes);
    else {
      for (const update of changes.updated) copyInto(update.editModel, update.dataItem);
      const list = this.data() as T[];
      list.push(...changes.inserted.filter((item) => !this.addToParentChildren(item)));
      for (const item of changes.deleted) {
        const index = list.indexOf(item);
        if (index >= 0) list.splice(index, 1);
      }
    }
    this.batchUpdated.set(new Map());
    for (const item of this.batchInserted()) this.newRowParents.delete(item);
    this.batchInserted.set([]);
    this.batchDeleted.set(new Map());
    this.batchErrors.set(new Map());
    this.batchCell.set(null);
    this.version.update((v) => v + 1);
    return true;
  }

  protected readonly newRowAtBottom = computed(() => this.newItemRowPosition() === 'bottom' || (this.newItemRowPosition() === 'disabled' && this.editNewRowPosition() === 'bottom'));
  protected readonly showNewItemRow = computed(() => this.newItemRowPosition() !== 'disabled' && !this.isEditingNewRow());
  protected readonly hasCommandColumn = computed(() => this.leaves().some((c) => c.kind === 'command'));

  protected onNewItemRowKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void this.startNewRow();
    }
  }

  // ================================================================== keyboard

  protected async onBodyKeyDown(event: KeyboardEvent): Promise<void> {
    const target = event.target as HTMLElement;
    if (!target.matches('tr[data-row]') || this.editModel() != null) return;
    const rows = this.renderedRows();
    if (!rows.length) return;
    let position = rows.findIndex((r) => r.index === this.keyboardRow());
    if (position < 0) position = Math.max(0, rows.findIndex((r) => String(r.index) === target.dataset['row']));
    const row = rows[position];
    if (ROW_KEYS.includes(event.key)) event.preventDefault();
    const moveTo = (p: number) => {
      const next = rows[Math.max(0, Math.min(rows.length - 1, p))];
      this.keyboardRow.set(next.index);
      this.focusRowAfterRender = next.index;
      if (this.focusedRowEnabled() && next.item) this.focusedItem.set(next.item);
    };
    const ctrl = event.ctrlKey || event.metaKey;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (ctrl && this.allowDragRows() && row.item) await this.moveRowByKeyboard(row, event.key === 'ArrowDown');
        else moveTo(position + (event.key === 'ArrowDown' ? 1 : -1));
        break;
      case 'Home':
        moveTo(0);
        break;
      case 'End':
        moveTo(rows.length - 1);
        break;
      case 'PageDown':
        if (this.pagingActive()) this.goToPage(this.pageIndex() + 1);
        break;
      case 'PageUp':
        if (this.pagingActive()) this.goToPage(this.pageIndex() - 1);
        break;
      case 'ArrowRight':
      case 'ArrowLeft':
        // Tree list (treegrid): Right expands or enters a node, Left collapses or moves to the parent.
        if (this.isTree() && row.kind === 'data' && row.item) {
          const right = event.key === 'ArrowRight';
          if (right ? row.treeHasChildren && !row.treeExpanded : row.treeExpanded) {
            this.toggleTreeRow(row);
            this.focusRowAfterRender = row.index;
          } else if (right && row.treeExpanded) {
            if ((rows[position + 1]?.treeLevel ?? 0) > (row.treeLevel ?? 0)) moveTo(position + 1);
          } else if (!right && (row.treeLevel ?? 0) > 0) {
            for (let p = position - 1; p >= 0; p--) {
              if ((rows[p].treeLevel ?? 0) < (row.treeLevel ?? 0)) {
                moveTo(p);
                break;
              }
            }
          }
          break;
        }
        if (row.kind === 'group' && row.group && this.isExpanded(row.group) !== (event.key === 'ArrowRight')) this.toggleGroup(row.group);
        else if (row.kind === 'data' && row.item && this.detailTemplate() && this.detailRowDisplayMode() === 'auto') {
          if (event.key === 'ArrowRight') this.expandDetailRow(row.item);
          else this.collapseDetailRow(row.item);
        }
        this.focusRowAfterRender = row.index;
        break;
      case 'Enter':
      case 'F2':
        if (row.kind === 'group' && row.group) {
          this.toggleGroup(row.group);
          this.focusRowAfterRender = row.index;
        } else if (row.item && this.canEditRows() && this.editMode() !== 'batch') await this.startEdit(row.item);
        break;
      case ' ':
        if (row.item && this.selectionMode() !== 'none') {
          this.toggleRow(row.item);
          this.focusRowAfterRender = row.index;
        }
        break;
      case 'Delete':
        if (row.item && this.canEditRows()) await this.showDeleteConfirmation(row.item);
        break;
    }
  }

  // ================================================================== layout

  private emitLayout(): void {
    this.layoutChange.emit(this.getLayout());
  }

  /** The user's state: page, search, and every column's visibility, order, width, sort, group and filters. */
  getLayout(): PbGridLayout {
    return {
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      searchText: this.searchText(),
      columns: this.gridColumns().map<PbGridColumnLayout>((c) => ({
        key: c.key,
        visible: c.currentVisible(),
        visibleIndex: c.currentVisibleIndex(),
        width: c.currentWidth(),
        sortOrder: c.currentSort(),
        sortIndex: c.currentSortIndex(),
        groupIndex: c.currentGroupIndex(),
        filterRowValue: c.filterRowText(),
        filterRowOperator: c.filterRowOperator(),
        filterValues: c.filterValues() ? [...c.filterValues()!] : null,
      })),
    };
  }

  applyLayout(layout: PbGridLayout): void {
    this.pageIndex.set(layout.pageIndex);
    if (layout.pageSize > 0) this.pageSize.set(layout.pageSize);
    this.searchText.set(layout.searchText ?? '');
    for (const state of layout.columns) {
      const column = this.gridColumns().find((c) => c.key === state.key);
      if (!column) continue;
      column.currentVisible.set(state.visible);
      column.currentVisibleIndex.set(state.visibleIndex);
      column.currentWidth.set(state.width);
      column.currentSort.set(state.sortOrder);
      column.currentSortIndex.set(state.sortIndex);
      column.currentGroupIndex.set(state.groupIndex);
      column.filterRowText.set(state.filterRowValue);
      column.filterRowOperator.set(state.filterRowOperator);
      column.filterValues.set(state.filterValues ? [...state.filterValues] : null);
    }
  }

  // ================================================================== export

  exportToXlsx(fileName = 'export.xlsx', options: PbGridExportOptions = {}): void {
    const { columns, rows } = this.exportData({ groups: true, totalSummary: true, ...options });
    const widths = columns.map((c) => Math.min(60, Math.max(8, (pixelWidth(c.currentWidth()) ?? 120) / 7)));
    download(toXlsx(options.sheetName ?? 'Sheet1', columns.map((c) => c.displayCaption), widths, rows), fileName);
  }

  exportToCsv(fileName = 'export.csv', options: PbGridExportOptions = {}): void {
    const { columns, rows } = this.exportData({ groups: false, totalSummary: true, ...options });
    download(toCsv(columns.map((c) => c.displayCaption), rows), fileName);
  }

  private exportData(options: PbGridExportOptions): { columns: PbGridColumn[]; rows: ExportRow[] } {
    const columns = this.orderedLeaves().filter((c) => c.currentVisible() && c.isData && c.exportable());
    let items = this.getFilteredItems();
    if (options.selectedOnly) items = items.filter((i) => this.isSelected(i));
    const rows: ExportRow[] = [];
    const dataRow = (item: T, level: number): ExportRow => ({ cells: columns.map((c) => ({ value: this.cellValue(item, c) })), outlineLevel: level });
    const grouped = this.groupedColumns();
    if (options.groups && grouped.length && !this.dataProvider()) {
      const walk = (groups: GridGroup<T>[]) => {
        for (const group of groups) {
          rows.push({ cells: [{ value: `${group.column.displayCaption}: ${group.text} (${this.groupSummaryText(group)})`, bold: true }], outlineLevel: group.level });
          if (group.children) walk(group.children);
          else rows.push(...group.items.map((i) => dataRow(i, group.level + 1)));
        }
      };
      walk(this.buildGroups(items, 0, '', grouped));
    } else if (this.isTree()) {
      // Tree list: the outline level is the node depth (Excel shows the hierarchy as outline groups).
      const nodes = this.treeModel()?.nodes;
      rows.push(...items.map((i) => dataRow(i, nodes?.get(this.keyOf(i))?.level ?? 0)));
    } else rows.push(...items.map((i) => dataRow(i, 0)));
    if (options.totalSummary) {
      const defs = this.totalSummaryDefs();
      if (defs.length) {
        const values = defs.map((d) => this.summary(d, items, null, false));
        rows.push({
          cells: columns.map((c) => {
            const found = this.footerSummaries(values, c, defs);
            if (found.length === 1 && typeof found[0].value === 'number' && found[0].type !== 'custom') return { value: found[0].value, bold: true };
            return { value: found.length ? found.map((f) => f.text).join('; ') : null, bold: true };
          }),
        });
      }
    }
    return { columns, rows };
  }

  // ================================================================== tree list (pb-tree-list)

  /** Tree settings; null for a plain grid (pb-tree-list overrides this). */
  protected readonly treeConfig: Signal<PbGridTreeConfig<T> | null> = signal(null);
  protected readonly isTree = computed(() => this.treeConfig() != null);
  protected readonly treeRecursiveSelection = computed(() => !!this.treeConfig()?.recursiveSelection && this.selectionMode() === 'multiple');
  private readonly treeExpanded = signal(new Map<unknown, boolean>());
  private readonly treeExpandAll = signal<boolean | null>(null);
  private readonly treeLoaded = signal(new Map<unknown, readonly T[]>());
  private readonly treeLoading = signal(new Set<unknown>());
  private readonly newRowParent = signal<T | null>(null);
  /** New rows (pending or batch) under a parent: model -> parent key. */
  private readonly newRowParents = new Map<T, unknown>();

  /** The hierarchy: flat (key + parent key), nested (children field) and children loaded on demand. */
  private readonly treeModel = computed(() => {
    const tree = this.treeConfig();
    if (!tree) return null;
    this.version();
    const inserted = this.batchInserted();
    const loaded = this.treeLoaded();
    const nodes = new Map<unknown, TreeNode<T>>();
    const roots: TreeNode<T>[] = [];
    const addNested = (item: T, parent: TreeNode<T> | null, level: number): TreeNode<T> | null => {
      const key = this.keyOf(item);
      if (item == null || nodes.has(key)) return null;
      const node: TreeNode<T> = { item, key, parent, children: [], level, mayHaveChildren: false };
      nodes.set(key, node);
      const children: T[] = [];
      if (tree.childrenField) {
        const nested = getField(item, tree.childrenField);
        if (Array.isArray(nested)) children.push(...(nested as T[]));
      }
      children.push(...(loaded.get(key) ?? []));
      for (const ins of inserted) if (this.newRowParents.get(ins) === key) children.push(ins);
      for (const child of children) {
        const childNode = addNested(child, node, level + 1);
        if (childNode) node.children.push(childNode);
      }
      return node;
    };
    if (tree.childrenField || (tree.loadChildren && !tree.parentKeyField)) {
      for (const item of this.data()) {
        const node = addNested(item, null, 0);
        if (node) roots.push(node);
      }
      for (const ins of inserted) {
        if (this.newRowParents.has(ins)) continue;
        const node = addNested(ins, null, 0);
        if (node) roots.push(node);
      }
    } else {
      for (const item of [...this.data(), ...inserted]) {
        const key = this.keyOf(item);
        if (item != null && !nodes.has(key)) nodes.set(key, { item, key, parent: null, children: [], level: 0, mayHaveChildren: false });
      }
      for (const node of nodes.values()) {
        const parentKey = tree.parentKeyField ? getField(node.item, tree.parentKeyField) : null;
        const parent = parentKey != null && parentKey !== tree.rootValue && parentKey !== node.key ? nodes.get(parentKey) : undefined;
        if (parent && !isAncestor(node, parent)) {
          node.parent = parent;
          parent.children.push(node);
        }
      }
      for (const node of nodes.values()) if (!node.parent) roots.push(node);
      const setLevels = (node: TreeNode<T>, level: number) => {
        node.level = level;
        node.children.forEach((c) => setLevels(c, level + 1));
      };
      roots.forEach((r) => setLevels(r, 0));
      for (const [parentKey, children] of loaded) {
        const parent = nodes.get(parentKey);
        if (!parent) continue;
        for (const child of children) {
          const node = addNested(child, parent, parent.level + 1);
          if (node) parent.children.push(node);
        }
      }
    }
    if (tree.hasChildrenField) {
      for (const node of nodes.values()) {
        node.mayHaveChildren = node.children.length === 0 && getField(node.item, tree.hasChildrenField) === true && !loaded.has(node.key);
      }
    }
    return { nodes, roots };
  });

  /** Filters (keeping the matches' ancestors), sorts siblings and emits the expanded branches. */
  private buildTreeView(tree: PbGridTreeConfig<T>, model: { nodes: Map<unknown, TreeNode<T>>; roots: TreeNode<T>[] }) {
    const filter = this.filterEnabled() ? this.userFilter() : null;
    const searching = this.searchWords().length > 0;
    const filtered = !!filter || searching;
    const matched = new Set<TreeNode<T>>();
    const visible = new Set<TreeNode<T>>();
    if (filtered) {
      const matches = (item: T) => (!filter || filterMatches(filter, item, this)) && (!searching || this.matchesSearch(item));
      const mark = (node: TreeNode<T>, ancestorMatches: boolean): boolean => {
        const self = matches(node.item);
        if (self) matched.add(node);
        let below = false;
        for (const child of node.children) below = mark(child, ancestorMatches || self) || below;
        const mode = tree.filterTreeMode;
        if (mode === 'entireBranch' ? self || below || ancestorMatches : mode === 'matches' ? self : self || below) visible.add(node);
        return self || below;
      };
      model.roots.forEach((root) => mark(root, false));
    }
    const shownChildren = (node: TreeNode<T>): TreeNode<T>[] => {
      if (!filtered) return node.children;
      if (tree.filterTreeMode !== 'matches') return node.children.filter((c) => visible.has(c));
      const result: TreeNode<T>[] = [];
      const collect = (n: TreeNode<T>) => n.children.forEach((c) => (matched.has(c) ? result.push(c) : collect(c)));
      collect(node);
      return result;
    };
    let roots = model.roots;
    if (filtered) {
      roots =
        tree.filterTreeMode === 'matches'
          ? [...model.nodes.values()].filter((n) => {
              if (!matched.has(n)) return false;
              let parent = n.parent;
              while (parent && !matched.has(parent)) parent = parent.parent;
              return !parent;
            })
          : roots.filter((r) => visible.has(r));
    }
    const sortNodes = (nodes: TreeNode<T>[]) => {
      const byItem = new Map(nodes.map((n) => [n.item, n] as const));
      return this.sortItems(nodes.map((n) => n.item)).map((i) => byItem.get(i)!);
    };
    const rows: GridRow<T>[] = [];
    const ordered: T[] = [];
    let dataIndex = 0;
    const expandedMap = this.treeExpanded();
    const expandAll = this.treeExpandAll();
    const loading = this.treeLoading();
    const inserted = new Set(this.batchInserted());
    const emit = (node: TreeNode<T>, level: number) => {
      ordered.push(node.item);
      const children = shownChildren(node);
      const hasChildren = children.length > 0 || (node.mayHaveChildren && !filtered);
      const expanded = hasChildren && (expandedMap.get(node.key) ?? (filtered && children.length > 0 ? true : (expandAll ?? tree.autoExpandAllNodes)));
      rows.push({
        kind: 'data',
        item: node.item,
        level: 0,
        index: rows.length,
        dataIndex: dataIndex++,
        inserted: inserted.has(node.item),
        treeLevel: level,
        treeHasChildren: hasChildren,
        treeExpanded: expanded,
        treeLoading: loading.has(node.key),
      });
      if (expanded) sortNodes(children).forEach((c) => emit(c, level + 1));
      else {
        // Collapsed: still part of the filtered set (summaries, select all, export).
        const collect = (n: TreeNode<T>) => {
          ordered.push(n.item);
          shownChildren(n).forEach(collect);
        };
        children.forEach(collect);
      }
    };
    sortNodes(roots).forEach((root) => emit(root, 0));
    const totals = this.totalSummaryDefs().map((d) => this.summary(d, ordered, null, false));
    return { rows, items: ordered, total: ordered.length, rowCount: rows.length, totals };
  }

  /** Tree list: whether the item's node is expanded. */
  isRowExpanded(item: T): boolean {
    return this.view().rows.some((r) => r.item != null && r.treeExpanded && this.keyOf(r.item) === this.keyOf(item));
  }

  /** Tree list: expands the item's node (loading its children on demand). */
  expandRow(item: T): Promise<void> {
    return this.setNodeExpanded(item, true);
  }

  collapseRow(item: T): Promise<void> {
    return this.setNodeExpanded(item, false);
  }

  /** Tree list: expands every node (nodes loaded on demand stay collapsed). */
  expandAllRows(): void {
    this.treeExpanded.set(new Map());
    this.treeExpandAll.set(true);
  }

  collapseAllRows(): void {
    this.treeExpanded.set(new Map());
    this.treeExpandAll.set(false);
  }

  /** Tree list: the item's parent (null for root nodes). */
  getParentItem(item: T): T | null {
    return this.treeModel()?.nodes.get(this.keyOf(item))?.parent?.item ?? null;
  }

  /** Tree list: the item's children (loaded ones, unfiltered). */
  getChildItems(item: T): T[] {
    return this.treeModel()?.nodes.get(this.keyOf(item))?.children.map((c) => c.item) ?? [];
  }

  protected toggleTreeRow(row: GridRow<T>): void {
    if (row.item) void this.setNodeExpanded(row.item, !row.treeExpanded);
  }

  private async setNodeExpanded(item: T, expanded: boolean): Promise<void> {
    const tree = this.treeConfig();
    if (!tree || item == null) return;
    const key = this.keyOf(item);
    this.treeExpanded.update((m) => new Map(m).set(key, expanded));
    tree.expandedChange?.({ dataItem: item, expanded });
    if (!expanded || !tree.loadChildren || this.treeLoaded().has(key) || this.treeLoading().has(key)) return;
    const node = this.treeModel()?.nodes.get(key);
    if (node && node.children.length > 0 && !node.mayHaveChildren) return;
    this.treeLoading.update((s) => new Set(s).add(key));
    try {
      const children = await tree.loadChildren(item);
      this.treeLoaded.update((m) => new Map(m).set(key, [...children]));
    } finally {
      this.treeLoading.update((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
    }
  }

  /** The cell of this column draws the indent and the expand button. */
  protected isTreeColumn(column: PbGridColumn): boolean {
    const tree = this.treeConfig();
    if (!tree) return false;
    const leaves = this.leaves();
    const target = tree.treeColumn ? leaves.find((c) => c.key === tree.treeColumn || c.field() === tree.treeColumn) : leaves.find((c) => c.isData);
    return column === target;
  }

  private isInBranch(item: T, root: T): boolean {
    const nodes = this.treeModel()?.nodes;
    const node = nodes?.get(this.keyOf(item));
    const top = nodes?.get(this.keyOf(root));
    return !!node && !!top && isAncestor(top, node);
  }

  private descendants(node: TreeNode<T>): TreeNode<T>[] {
    return node.children.flatMap((c) => [c, ...this.descendants(c)]);
  }

  /** Recursive selection: true when the node and its subtree are selected, null when partly. */
  protected treeCheckState(item: T): boolean | null {
    const node = this.treeModel()?.nodes.get(this.keyOf(item));
    if (!node || !node.children.length) return this.isSelected(item);
    const all = this.descendants(node);
    const map = this.selectedMap();
    const count = all.filter((n) => map.has(n.key)).length;
    if (count === all.length && map.has(node.key)) return true;
    return count === 0 && !map.has(node.key) ? false : null;
  }

  protected toggleTreeSelection(item: T): void {
    const select = this.treeCheckState(item) !== true;
    const node = this.treeModel()?.nodes.get(this.keyOf(item));
    const map = new Map(this.selectedMap());
    if (!node) {
      if (select) map.set(this.keyOf(item), item);
      else map.delete(this.keyOf(item));
    } else {
      for (const target of [node, ...this.descendants(node)]) {
        if (select) map.set(target.key, target.item);
        else map.delete(target.key);
      }
      // A parent is selected exactly when all its children are.
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (parent.children.every((c) => map.has(c.key))) map.set(parent.key, parent.item);
        else map.delete(parent.key);
      }
    }
    this.setSelection(map);
  }

  /** Tree list: opens the editor for a new row under parent (its parent key is set for flat data). */
  async startNewChildRow(parent: T): Promise<void> {
    this.newRowParent.set(parent);
    await this.setNodeExpanded(parent, true);
    await this.startNewRowCore();
  }

  private attachToParent(model: T): void {
    const tree = this.treeConfig();
    const parent = this.newRowParent();
    if (!tree || !parent || model == null) return;
    const parentKey = this.keyOf(parent);
    if (tree.parentKeyField) setField(model, tree.parentKeyField, parentKey);
    this.newRowParents.set(model, parentKey);
  }

  /** Nested data: adds a saved new row to its parent's children array. */
  private addToParentChildren(model: T): boolean {
    const tree = this.treeConfig();
    const parentKey = this.newRowParents.get(model);
    if (!tree?.childrenField || parentKey === undefined) return false;
    const parent = this.treeModel()?.nodes.get(parentKey);
    const children = parent ? getField(parent.item, tree.childrenField) : null;
    if (!Array.isArray(children)) return false;
    children.push(model);
    return true;
  }

  /** The new row editor goes right under its parent row. */
  protected readonly newRowUnderParent = computed(
    () => this.isTree() && this.isEditingNewRow() && this.newRowParent() != null && this.editMode() !== 'popupEditForm' && this.editMode() !== 'batch',
  );

  protected isNewRowParent(item: T): boolean {
    const parent = this.newRowParent();
    return this.newRowUnderParent() && parent != null && this.keyOf(parent) === this.keyOf(item);
  }

  /** Drops on the upper or lower half; in a tree list the middle half makes the rows children. */
  private rowDropPosition(row: HTMLElement, clientY: number): PbGridDropPosition {
    const r = row.getBoundingClientRect();
    const y = (clientY - r.top) / r.height;
    if (this.isTree()) return y < 0.25 ? 'before' : y > 0.75 ? 'after' : 'inside';
    return y < 0.5 ? 'before' : 'after';
  }

  // ================================================================== resize and drag and drop

  protected onHostPointerDown(event: PointerEvent): void {
    const handle = (event.target as HTMLElement).closest?.('.pb-data-grid__resizer') as HTMLElement | null;
    if (!handle || handle.closest('.pb-data-grid') !== this.host || this.columnResizeMode() === 'disabled' || event.button !== 0) return;
    this.startColumnResize(event, handle);
  }

  private startColumnResize(event: PointerEvent, handle: HTMLElement): void {
    const table = this.host.querySelector(':scope > .pb-data-grid__scroll > .pb-data-grid__table') as HTMLTableElement;
    const cells = [...(table.tHead?.rows[0]?.cells ?? [])];
    const cols = [...table.querySelectorAll<HTMLElement>(':scope > colgroup > col')];
    const index = cells.findIndex((c) => c.dataset['colKey'] === handle.dataset['colKey']);
    if (index < 0 || cols.length !== cells.length) return;
    event.preventDefault();
    event.stopPropagation();
    const widths = cells.map((c) => c.getBoundingClientRect().width);
    cols.forEach((col, i) => (col.style.width = `${widths[i]}px`));
    const mode = this.columnResizeMode();
    let next = -1;
    if (mode === 'nextColumn') next = cells.findIndex((c, i) => i > index && !!c.dataset['colKey']);
    const tableWidth = table.getBoundingClientRect().width;
    const originalWidth = table.style.width;
    table.style.width = `${tableWidth}px`;
    const min = Number(cells[index].dataset['minWidth'] || 40);
    const nextMin = next >= 0 ? Number(cells[next].dataset['minWidth'] || 40) : 0;
    const direction = getComputedStyle(this.host).direction === 'rtl' ? -1 : 1;
    const header = handle.closest('th');
    const draggable = header?.getAttribute('draggable');
    header?.removeAttribute('draggable');
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      /* synthetic event */
    }
    this.host.classList.add('pb-data-grid--resizing');
    const move = (e: PointerEvent) => {
      let dx = (e.clientX - event.clientX) * direction;
      if (next >= 0) {
        dx = Math.min(Math.max(dx, min - widths[index]), widths[next] - nextMin);
        cols[index].style.width = `${widths[index] + dx}px`;
        cols[next].style.width = `${widths[next] - dx}px`;
      } else {
        const width = Math.max(min, widths[index] + dx);
        cols[index].style.width = `${width}px`;
        table.style.width = `${tableWidth + width - widths[index]}px`;
      }
      this.syncFixedColumns();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      this.host.classList.remove('pb-data-grid--resizing');
      if (draggable != null) header?.setAttribute('draggable', draggable);
      table.style.width = originalWidth;
      this.suppressHeaderClick = true;
      setTimeout(() => (this.suppressHeaderClick = false), 0);
      cells.forEach((cell, i) => {
        const key = cell.dataset['colKey'];
        if (key) this.getColumn(key)?.currentWidth.set(`${Math.round(parseFloat(cols[i].style.width))}px`);
      });
      this.emitLayout();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  private readonly dragGroupName = computed(() => this.dragDropGroup() ?? (this.allowDragRows() ? this.gridId : null));

  private clearDropMarks(): void {
    this.host
      .querySelectorAll('.pb-data-grid__drop-before, .pb-data-grid__drop-after, .pb-data-grid__row--drop-before, .pb-data-grid__row--drop-after, .pb-data-grid__row--drop-inside')
      .forEach((el) => el.classList.remove('pb-data-grid__drop-before', 'pb-data-grid__drop-after', 'pb-data-grid__row--drop-before', 'pb-data-grid__row--drop-after', 'pb-data-grid__row--drop-inside'));
    this.host.querySelectorAll('.pb-data-grid__group-panel--drop').forEach((el) => el.classList.remove('pb-data-grid__group-panel--drop'));
    this.host.classList.remove('pb-data-grid--drop-target');
  }

  private ownsTarget(event: Event): boolean {
    return (event.target as HTMLElement).closest?.('.pb-data-grid') === this.host;
  }

  private rowDropAllowed(): boolean {
    if (!gridDrag || gridDrag.kind !== 'row' || !this.itemsDropped()) return false;
    if (gridDrag.group !== this.dragGroupName()) return false;
    return gridDrag.gridId === this.gridId ? !!gridDrag.allowInternal : !!gridDrag.allowExternal;
  }

  protected onDragStart(event: DragEvent): void {
    if (!this.ownsTarget(event)) return;
    const target = event.target as HTMLElement;
    if (this.host.classList.contains('pb-data-grid--resizing') || target.closest('.pb-data-grid__resizer')) {
      event.preventDefault();
      return;
    }
    const handle = target.closest('.pb-data-grid__drag-handle');
    if (handle) {
      const row = handle.closest('tr[data-row]') as HTMLElement | null;
      if (!row || !this.dragGroupName()) return;
      const allowed = this.allowedDropTarget();
      gridDrag = {
        kind: 'row',
        gridId: this.gridId,
        group: this.dragGroupName(),
        allowInternal: allowed === 'all' || allowed === 'internal',
        allowExternal: allowed === 'all' || allowed === 'external',
      };
      event.dataTransfer!.effectAllowed = 'move';
      event.dataTransfer!.setData('text/plain', '');
      try {
        event.dataTransfer!.setDragImage(row, 24, 24);
      } catch {
        /* not supported */
      }
      row.classList.add('pb-data-grid__row--dragging');
      const item = this.itemAtRow(Number(row.dataset['row']));
      this.draggedItems = !item ? [] : this.isSelected(item) && this.selectedItems().length > 1 ? this.view().rows.filter((r) => r.item && this.isSelected(r.item)).map((r) => r.item!) : [item];
      return;
    }
    const header = target.closest("th[data-col-key][draggable='true'], .pb-data-grid__group-chip") as HTMLElement | null;
    if (header) {
      gridDrag = { kind: 'column', gridId: this.gridId, key: header.dataset['colKey'], fromPanel: header.classList.contains('pb-data-grid__group-chip') };
      header.classList.add(header.matches('th') ? 'pb-data-grid__header-cell--dragging' : 'pb-data-grid__group-chip--dragging');
      event.dataTransfer!.effectAllowed = 'move';
      event.dataTransfer!.setData('text/plain', header.dataset['colKey'] ?? '');
    }
  }

  private columnDropTarget(event: DragEvent): { panel?: HTMLElement; th?: HTMLElement; head?: HTMLElement } | null {
    const target = event.target as HTMLElement;
    const panel = target.closest('[data-pb-group-panel]') as HTMLElement | null;
    if (panel && panel.closest('.pb-data-grid') === this.host) return { panel };
    const th = target.closest('th[data-col-key]') as HTMLElement | null;
    if (th && th.closest('.pb-data-grid') === this.host) return { th };
    const head = target.closest('thead') as HTMLElement | null;
    if (head && head.closest('.pb-data-grid') === this.host) return { head };
    return null;
  }

  private dropAfter(th: HTMLElement, event: DragEvent): boolean {
    const r = th.getBoundingClientRect();
    return event.clientX - r.left > r.width / 2 !== (getComputedStyle(this.host).direction === 'rtl');
  }

  protected onDragOver(event: DragEvent): void {
    if (!gridDrag || !this.ownsTarget(event)) return;
    this.clearDropMarks();
    if (gridDrag.kind === 'column') {
      if (gridDrag.gridId !== this.gridId) return;
      const target = this.columnDropTarget(event);
      if (!target) return;
      if (target.panel) {
        event.preventDefault();
        target.panel.classList.add('pb-data-grid__group-panel--drop');
      } else if ((target.th || target.head) && gridDrag.fromPanel) {
        event.preventDefault();
      } else if (target.th && target.th.dataset['colKey'] !== gridDrag.key) {
        event.preventDefault();
        target.th.classList.add(this.dropAfter(target.th, event) ? 'pb-data-grid__drop-after' : 'pb-data-grid__drop-before');
      }
      return;
    }
    if (!this.rowDropAllowed()) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    const row = (event.target as HTMLElement).closest('tbody > tr[data-row]') as HTMLElement | null;
    if (row && row.closest('.pb-data-grid') === this.host) {
      row.classList.add('pb-data-grid__row--drop-' + this.rowDropPosition(row, event.clientY));
    } else this.host.classList.add('pb-data-grid--drop-target');
  }

  protected onDragLeave(event: DragEvent): void {
    if (!this.host.contains(event.relatedTarget as Node)) this.clearDropMarks();
  }

  protected onDrop(event: DragEvent): void {
    if (!gridDrag || !this.ownsTarget(event)) return;
    const drag = gridDrag;
    this.clearDropMarks();
    if (drag.kind === 'column') {
      if (drag.gridId !== this.gridId || !drag.key) return;
      const target = this.columnDropTarget(event);
      if (!target) return;
      event.preventDefault();
      if (target.panel) {
        const chips = [...target.panel.querySelectorAll<HTMLElement>('.pb-data-grid__group-chip')].filter((c) => !c.classList.contains('pb-data-grid__group-chip--dragging'));
        let index = 0;
        chips.forEach((chip, i) => {
          const r = chip.getBoundingClientRect();
          if (event.clientX > r.left + r.width / 2) index = i + 1;
        });
        if (this.allowGroup()) this.groupBy(drag.key, index);
      } else if (drag.fromPanel) {
        this.ungroup(drag.key);
      } else if (target.th && target.th.dataset['colKey'] !== drag.key && this.allowColumnReorder()) {
        this.moveColumn(drag.key, target.th.dataset['colKey']!, this.dropAfter(target.th, event));
      }
      gridDrag = null;
      this.emitLayout();
      return;
    }
    if (!this.rowDropAllowed()) return;
    event.preventDefault();
    const row = (event.target as HTMLElement).closest('tbody > tr[data-row]') as HTMLElement | null;
    let targetIndex = -1;
    let position: PbGridDropPosition = 'after';
    if (row && row.closest('.pb-data-grid') === this.host) {
      targetIndex = Number(row.dataset['row']);
      position = this.rowDropPosition(row, event.clientY);
    }
    gridDrag = null;
    this.dropRows(drag.gridId, targetIndex, position);
  }

  protected onDragEnd(): void {
    gridDrag = null;
    document
      .querySelectorAll('.pb-data-grid__row--dragging, .pb-data-grid__header-cell--dragging, .pb-data-grid__group-chip--dragging')
      .forEach((el) => el.classList.remove('pb-data-grid__row--dragging', 'pb-data-grid__header-cell--dragging', 'pb-data-grid__group-chip--dragging'));
    this.clearDropMarks();
  }

  private dropRows(sourceId: string, targetIndex: number, position: PbGridDropPosition): void {
    const source = gridRegistry.get(sourceId);
    const handler = this.itemsDropped();
    if (!source || !handler) return;
    const items = source.draggedItems as T[];
    if (!items.length) return;
    const target = targetIndex >= 0 ? (this.itemAtRow(targetIndex) ?? null) : null;
    const external = source !== this;
    if (!external && target && items.some((i) => this.keyOf(i) === this.keyOf(target))) return;
    // Tree list: a node cannot move into its own branch.
    if (!external && target && this.isTree() && items.some((i) => this.isInBranch(target, i))) return;
    handler({ items, target, position, sourceGrid: source, external });
    source.reload();
    this.reload();
  }

  private itemAtRow(index: number): T | undefined {
    return this.view().rows[index]?.item ?? (this.dataProvider() ? this.virtualCache().get(index) : undefined);
  }

  private async moveRowByKeyboard(row: GridRow<T>, down: boolean): Promise<void> {
    const handler = this.itemsDropped();
    if (!handler || !row.item) return;
    const rows = this.renderedRows().filter((r) => r.kind === 'data' && !r.inserted && r.item);
    const position = rows.findIndex((r) => r.index === row.index);
    const neighbour = rows[position + (down ? 1 : -1)];
    if (position < 0 || !neighbour) return;
    const key = this.keyOf(row.item);
    handler({ items: [row.item], target: neighbour.item!, position: down ? 'after' : 'before', sourceGrid: this, external: false });
    this.reload();
    queueMicrotask(() => {
      const moved = this.view().rows.find((r) => r.item && this.keyOf(r.item) === key);
      if (moved) {
        this.keyboardRow.set(moved.index);
        this.focusRowAfterRender = moved.index;
      }
    });
  }
}

function pixelWidth(width: string | null): number | null {
  if (!width || !width.endsWith('px')) return null;
  const value = parseFloat(width);
  return isNaN(value) ? null : value;
}
