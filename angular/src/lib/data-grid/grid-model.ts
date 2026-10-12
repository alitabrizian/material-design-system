/*
 * pb-data-grid model: types, filter criteria, field access and formatting. Mirrors the Blazor
 * PBDataGrid (Components/DataGrid) so both grids behave and look the same.
 */

export type PbGridSortOrder = 'none' | 'asc' | 'desc';
export type PbGridSelectionMode = 'none' | 'single' | 'multiple';
export type PbGridSelectAllMode = 'page' | 'allPages';
export type PbGridEditMode = 'editForm' | 'popupEditForm' | 'editRow' | 'editCell' | 'batch';
export type PbGridNewItemRowPosition = 'disabled' | 'top' | 'bottom';
export type PbGridGroupInterval = 'value' | 'alphabetical' | 'date' | 'month' | 'year' | 'custom';
export type PbGridSummaryType = 'count' | 'sum' | 'min' | 'max' | 'avg' | 'custom';
export type PbGridFixedPosition = 'none' | 'left' | 'right';
export type PbGridColumnResizeMode = 'disabled' | 'nextColumn' | 'columnsContainer';
export type PbGridLines = 'horizontal' | 'vertical' | 'both' | 'none';
export type PbGridPagerPosition = 'bottom' | 'top' | 'topAndBottom';
export type PbGridDetailRowDisplayMode = 'auto' | 'always';
/** Where dropped rows go; 'inside' (tree list) makes them children of the target. */
export type PbGridDropPosition = 'before' | 'after' | 'inside';
export type PbGridFilterPanelDisplayMode = 'never' | 'auto' | 'always';
export type PbGridGroupFooterDisplayMode = 'auto' | 'always' | 'never';
export type PbGridDataType = 'string' | 'number' | 'date' | 'boolean' | 'enum';
export type PbGridEditorType = 'auto' | 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'textarea' | 'none';
export type PbGridTextAlign = 'auto' | 'start' | 'center' | 'end';
export type PbGridContextMenuTarget = 'header' | 'dataRow' | 'groupPanel' | 'footer';
export type PbGridElementType = 'dataRow' | 'dataCell' | 'headerCell' | 'groupRow' | 'footerCell' | 'groupFooterCell';

/** A display format: a preset name, Intl options, or a function. */
export type PbGridFormat =
  | 'number'
  | 'integer'
  | 'currency'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'month'
  | 'year'
  | Intl.NumberFormatOptions
  | Intl.DateTimeFormatOptions
  | ((value: unknown) => string);

export type PbGridFilterOperator =
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'equals'
  | 'notEquals'
  | 'less'
  | 'lessOrEqual'
  | 'greater'
  | 'greaterOrEqual'
  | 'blank'
  | 'notBlank';

/** Filter criteria: a condition, a value list, or an AND/OR group (plain objects, so they serialize). */
export type PbGridFilter =
  | { kind: 'condition'; field: string; operator: PbGridFilterOperator; value?: unknown }
  | { kind: 'in'; field: string; values: unknown[] }
  | { kind: 'group'; or: boolean; filters: PbGridFilter[] };

export const PbGridFilters = {
  condition: (field: string, operator: PbGridFilterOperator, value?: unknown): PbGridFilter => ({ kind: 'condition', field, operator, value }),
  in: (field: string, values: unknown[]): PbGridFilter => ({ kind: 'in', field, values }),
  and: (...filters: (PbGridFilter | null | undefined)[]): PbGridFilter | null => group(false, filters),
  or: (...filters: (PbGridFilter | null | undefined)[]): PbGridFilter | null => group(true, filters),
};

function group(or: boolean, filters: (PbGridFilter | null | undefined)[]): PbGridFilter | null {
  const list = filters.filter((f): f is PbGridFilter => !!f);
  return list.length === 0 ? null : list.length === 1 ? list[0] : { kind: 'group', or, filters: list };
}

export interface PbGridCellContext<T = unknown> {
  $implicit: T;
  item: T;
  field: string | undefined;
  value: any;
  text: string;
  rowIndex: number;
  searchText: string;
}

export interface PbGridEditContext<T = unknown> {
  $implicit: T;
  item: T;
  field: string;
  value: unknown;
  isNew: boolean;
  errors: string[];
  setValue: (value: unknown) => void;
}

export interface PbGridGroupRowContext {
  /** The context itself: <ng-template pbGridGroupRow let-group> then group.text, group.count… */
  $implicit: PbGridGroupRowContext;
  field: string;
  caption: string;
  value: unknown;
  text: string;
  count: number;
  summaries: string[];
  level: number;
  expanded: boolean;
}

export interface PbGridEditFormContext<T = unknown> {
  $implicit: T;
  item: T;
  isNew: boolean;
  errors: Record<string, string[]>;
  setValue: (field: string, value: unknown) => void;
}

export interface PbGridSummaryValue {
  type: PbGridSummaryType;
  field?: string;
  name?: string;
  value: unknown;
  text: string;
}

export interface PbGridEditSavingEvent<T> {
  editModel: T;
  dataItem: T | null;
  isNew: boolean;
  cancel: boolean;
  /** Tree list: the parent of a new child row. */
  parentDataItem?: T | null;
}

/** Which nodes a tree list shows while filtering: the path to each match, plus their descendants, or only matches. */
export type PbTreeListFilterTreeMode = 'parentBranch' | 'entireBranch' | 'matches';

/** A tree list node was expanded or collapsed. */
export interface PbTreeListNodeExpandedEvent<T> {
  dataItem: T;
  expanded: boolean;
}

/** Tree settings of a data grid (set by pb-tree-list). */
export interface PbGridTreeConfig<T> {
  parentKeyField?: string;
  childrenField?: string;
  hasChildrenField?: string;
  rootValue?: unknown;
  loadChildren?: (parent: T) => Promise<readonly T[]>;
  autoExpandAllNodes: boolean;
  filterTreeMode: PbTreeListFilterTreeMode;
  recursiveSelection: boolean;
  treeColumn?: string;
  expandedChange?: (e: PbTreeListNodeExpandedEvent<T>) => void;
}

export interface PbGridItemDeletingEvent<T> {
  dataItem: T;
  cancel: boolean;
}

export interface PbGridBatchChanges<T> {
  updated: { dataItem: T; editModel: T }[];
  inserted: T[];
  deleted: T[];
}

export interface PbGridCustomSummaryEvent<T> {
  name?: string;
  field?: string;
  items: readonly T[];
  groupValue: unknown;
  value: unknown;
}

export interface PbGridCustomizeElementEvent<T> {
  type: PbGridElementType;
  item?: T;
  field?: string;
  value?: unknown;
  rowIndex: number;
  cssClass?: string;
  style?: string;
}

export interface PbGridItemsDroppedEvent<T> {
  items: T[];
  target: T | null;
  position: PbGridDropPosition;
  sourceGrid: unknown;
  external: boolean;
}

export interface PbGridContextMenuItem {
  text: string;
  icon?: string;
  disabled?: boolean;
  beginGroup?: boolean;
  action: () => void | Promise<void>;
}

export interface PbGridContextMenuEvent<T> {
  target: PbGridContextMenuTarget;
  field?: string;
  item?: T;
  items: PbGridContextMenuItem[];
}

export interface PbGridColumnLayout {
  key: string;
  visible: boolean;
  visibleIndex: number;
  width: string | null;
  sortOrder: PbGridSortOrder;
  sortIndex: number;
  groupIndex: number;
  filterRowValue: string | null;
  filterRowOperator: PbGridFilterOperator | null;
  filterValues: unknown[] | null;
}

/** A serializable snapshot of the user's grid state (save and restore layout). */
export interface PbGridLayout {
  pageIndex: number;
  pageSize: number;
  searchText: string;
  columns: PbGridColumnLayout[];
}

/** Server mode: the grid asks for one page of filtered, sorted rows. */
export interface PbGridDataRequest {
  skip: number;
  take: number;
  sort: { field: string; order: PbGridSortOrder }[];
  filter: PbGridFilter | null;
  searchText: string;
}

export interface PbGridDataResult<T> {
  items: T[];
  totalCount: number;
}

export interface PbGridExportOptions {
  selectedOnly?: boolean;
  /** Group rows (outlined); off exports a flat list. */
  groups?: boolean;
  totalSummary?: boolean;
  sheetName?: string;
}

// ------------------------------------------------------------------------------ field access

/** Reads a field or a dotted path ("customer.name"). */
export function getField(item: unknown, path: string): unknown {
  let value: unknown = item;
  for (const part of path.split('.')) {
    if (value == null) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

export function setField(item: unknown, path: string, value: unknown): void {
  const parts = path.split('.');
  let owner = item as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    owner = owner?.[parts[i]] as Record<string, unknown>;
    if (owner == null) return;
  }
  owner[parts[parts.length - 1]] = value;
}

/** A shallow copy that keeps the item's class and own getters (computed fields keep working). */
export function cloneItem<T>(item: T): T {
  if (item == null || typeof item !== 'object') return item;
  return Object.create(Object.getPrototypeOf(item), Object.getOwnPropertyDescriptors(item));
}

/** Copies own writable fields from one item to another (applying an edit). */
export function copyInto<T>(source: T, target: T): void {
  for (const key of Object.keys(source as object)) {
    const descriptor = Object.getOwnPropertyDescriptor(target as object, key);
    if (!descriptor || descriptor.writable || descriptor.set) (target as Record<string, unknown>)[key] = (source as Record<string, unknown>)[key];
  }
}

export function inferType(value: unknown): PbGridDataType {
  if (typeof value === 'number' || typeof value === 'bigint') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'date';
  return 'string';
}

export const isBlank = (value: unknown) => value == null || value === '';

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseIsoDay(value) : new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** "2026-03-07" as a local date (new Date("2026-03-07") would be UTC midnight). */
export function parseIsoDay(text: string): Date {
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const isDay = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Converts user input (often a string from an editor) to a field's type. Throws on bad input. */
export function convertTo(value: unknown, type: PbGridDataType): unknown {
  if (value == null || (typeof value === 'string' && value.trim() === '' && type !== 'string')) return null;
  switch (type) {
    case 'number': {
      const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
      if (isNaN(n)) throw new Error(`'${value}' is not a number`);
      return n;
    }
    case 'date': {
      const d = toDate(value);
      if (!d) throw new Error(`'${value}' is not a date`);
      return d;
    }
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (/^(true|yes|1)$/i.test(String(value))) return true;
      if (/^(false|no|0)$/i.test(String(value))) return false;
      throw new Error(`'${value}' is not yes/no`);
    default:
      return typeof value === 'string' ? value : String(value);
  }
}

export function tryConvert(value: unknown, type: PbGridDataType): { ok: boolean; value: unknown } {
  try {
    return { ok: true, value: convertTo(value, type) };
  } catch {
    return { ok: false, value: null };
  }
}

/** Orders values: blanks first, text by locale ignoring case, dates and numbers by value. */
export function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}

/** Equality as the user means it: text ignores case, a day matches the whole day. */
export function sameValue(value: unknown, target: unknown): boolean {
  if (value == null || target == null) return value == null && target == null;
  if (typeof value === 'string' && typeof target === 'string') return value.localeCompare(target, undefined, { sensitivity: 'base' }) === 0;
  const vd = value instanceof Date ? value : null;
  const td = target instanceof Date ? target : null;
  if (vd && td) return isDay(td) ? startOfDay(vd).getTime() === td.getTime() : vd.getTime() === td.getTime();
  return value === target;
}

// ------------------------------------------------------------------------------ filters

export interface PbGridFieldSource {
  type(field: string): PbGridDataType;
  value(item: unknown, field: string): unknown;
  text(item: unknown, field: string): string;
}

export const OPERATOR_TEXT: Record<PbGridFilterOperator, string> = {
  contains: 'Contains',
  notContains: 'Does not contain',
  startsWith: 'Begins with',
  endsWith: 'Ends with',
  equals: 'Equals',
  notEquals: 'Does not equal',
  less: 'Is less than',
  lessOrEqual: 'Is less than or equal to',
  greater: 'Is greater than',
  greaterOrEqual: 'Is greater than or equal to',
  blank: 'Is blank',
  notBlank: 'Is not blank',
};

export const OPERATOR_GLYPH: Record<PbGridFilterOperator, string> = {
  contains: '∋',
  notContains: '∌',
  startsWith: 'a…',
  endsWith: '…z',
  equals: '=',
  notEquals: '≠',
  less: '<',
  lessOrEqual: '≤',
  greater: '>',
  greaterOrEqual: '≥',
  blank: '∅',
  notBlank: '≠∅',
};

const OPERATOR_SYMBOL: Partial<Record<PbGridFilterOperator, string>> = {
  equals: '=',
  notEquals: '<>',
  less: '<',
  lessOrEqual: '<=',
  greater: '>',
  greaterOrEqual: '>=',
};

/** Operators that make sense for a field type. */
export function operatorsFor(type: PbGridDataType): PbGridFilterOperator[] {
  if (type === 'string') return ['contains', 'notContains', 'startsWith', 'endsWith', 'equals', 'notEquals', 'blank', 'notBlank'];
  if (type === 'boolean' || type === 'enum') return ['equals', 'notEquals', 'blank', 'notBlank'];
  return ['equals', 'notEquals', 'less', 'lessOrEqual', 'greater', 'greaterOrEqual', 'blank', 'notBlank'];
}

export function filterMatches(filter: PbGridFilter, item: unknown, source: PbGridFieldSource): boolean {
  switch (filter.kind) {
    case 'group':
      return filter.filters.length === 0 || (filter.or ? filter.filters.some((f) => filterMatches(f, item, source)) : filter.filters.every((f) => filterMatches(f, item, source)));
    case 'in': {
      const type = source.type(filter.field);
      const value = source.value(item, filter.field);
      return filter.values.some((candidate) => {
        if (candidate == null) return value == null;
        const converted = tryConvert(candidate, type === 'enum' ? 'string' : type);
        return converted.ok && sameValue(value, converted.value);
      });
    }
    default:
      return conditionMatches(filter, item, source);
  }
}

function conditionMatches(filter: Extract<PbGridFilter, { kind: 'condition' }>, item: unknown, source: PbGridFieldSource): boolean {
  const type = source.type(filter.field);
  const value = source.value(item, filter.field);
  const op = filter.operator;
  if (op === 'blank' || op === 'notBlank') return op === 'blank' ? isBlank(value) : !isBlank(value);
  if (op === 'contains' || op === 'notContains' || op === 'startsWith' || op === 'endsWith') {
    const text = String(filter.value ?? '');
    if (type !== 'string' && type !== 'enum') {
      const parsed = tryConvert(text, type);
      const equal = parsed.ok && parsed.value != null && sameValue(value, parsed.value);
      return op === 'notContains' ? !equal : equal;
    }
    const s = value == null ? null : String(value).toLocaleLowerCase();
    const t = text.toLocaleLowerCase();
    const match = s != null && (op === 'startsWith' ? s.startsWith(t) : op === 'endsWith' ? s.endsWith(t) : s.includes(t));
    return op === 'notContains' ? !match : match;
  }
  const target = tryConvert(filter.value, type === 'enum' ? 'string' : type);
  if (!target.ok) return false;
  if (op === 'equals') return sameValue(value, target.value);
  if (op === 'notEquals') return !sameValue(value, target.value);
  if (value == null || target.value == null) return false;
  let left = value;
  if (left instanceof Date && target.value instanceof Date && isDay(target.value)) left = startOfDay(left);
  const c = compareValues(left, target.value);
  return op === 'less' ? c < 0 : op === 'lessOrEqual' ? c <= 0 : op === 'greater' ? c > 0 : c >= 0;
}

export function filterFields(filter: PbGridFilter | null): string[] {
  if (!filter) return [];
  return filter.kind === 'group' ? [...new Set(filter.filters.flatMap(filterFields))] : [filter.field];
}

export function filterValueText(value: unknown): string {
  if (value == null) return 'null';
  if (value instanceof Date) return `#${value.toLocaleDateString()}#`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return `'${value}'`;
}

/** Readable form for the filter panel: [Status] = 'New' And [Total] > 500 */
export function filterText(filter: PbGridFilter, caption: (field: string) => string): string {
  switch (filter.kind) {
    case 'group':
      return filter.filters
        .map((f) => (f.kind === 'group' && f.filters.length > 1 ? `(${filterText(f, caption)})` : filterText(f, caption)))
        .join(filter.or ? ' Or ' : ' And ');
    case 'in':
      return `[${caption(filter.field)}] In (${filter.values.map(filterValueText).join(', ')})`;
    default:
      return filter.operator === 'blank' || filter.operator === 'notBlank'
        ? `[${caption(filter.field)}] ${OPERATOR_TEXT[filter.operator]}`
        : `[${caption(filter.field)}] ${OPERATOR_SYMBOL[filter.operator] ?? OPERATOR_TEXT[filter.operator]} ${filterValueText(filter.value)}`;
  }
}

// ------------------------------------------------------------------------------ formatting

// .NET's "d" / "g": 2/9/2025, 2/9/2025 8:00 AM.
const SHORT_DATE: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
const SHORT_DATE_TIME: Intl.DateTimeFormatOptions = { ...SHORT_DATE, hour: 'numeric', minute: '2-digit' };

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(options);
  let format = numberFormats.get(key);
  if (!format) numberFormats.set(key, (format = new Intl.NumberFormat(locale, options)));
  return format;
}

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(options);
  let format = dateFormats.get(key);
  if (!format) dateFormats.set(key, (format = new Intl.DateTimeFormat(locale, options)));
  return format;
}

/** "orderDate" -> "Order Date" */
export function splitWords(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatValue(value: unknown, format: PbGridFormat | undefined, locale: string, currency: string): string {
  if (value == null || value === '') return '';
  if (typeof format === 'function') return format(value);
  if (typeof format === 'object') {
    const date = toDate(value);
    return value instanceof Date || (date && !('style' in format)) ? dateFormat(locale, format as Intl.DateTimeFormatOptions).format(date!) : numberFormat(locale, format as Intl.NumberFormatOptions).format(Number(value));
  }
  switch (format) {
    case 'currency':
      return numberFormat(locale, { style: 'currency', currency }).format(Number(value));
    case 'percent':
      return numberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(Number(value));
    case 'number':
      return numberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
    case 'integer':
      return numberFormat(locale, { maximumFractionDigits: 0 }).format(Number(value));
    case 'date':
      return toDate(value) ? dateFormat(locale, SHORT_DATE).format(toDate(value)!) : String(value);
    case 'datetime':
      return toDate(value) ? dateFormat(locale, SHORT_DATE_TIME).format(toDate(value)!) : String(value);
    case 'month':
      return toDate(value) ? dateFormat(locale, { month: 'long', year: 'numeric' }).format(toDate(value)!) : String(value);
    case 'year':
      return toDate(value) ? String(toDate(value)!.getFullYear()) : String(value);
  }
  if (value instanceof Date) return dateFormat(locale, isDay(value) ? SHORT_DATE : SHORT_DATE_TIME).format(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  // Like .NET's default ToString(): no thousands separators (ids and years stay "10248", "2026").
  if (typeof value === 'number') return numberFormat(locale, { maximumFractionDigits: 2, useGrouping: false }).format(value);
  return String(value);
}
