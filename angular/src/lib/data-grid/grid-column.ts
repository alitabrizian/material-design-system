import { booleanAttribute, contentChild, Directive, ElementRef, inject, input, linkedSignal, numberAttribute, signal, TemplateRef } from '@angular/core';
import {
  PbGridCellContext,
  PbGridDataType,
  PbGridEditContext,
  PbGridEditFormContext,
  PbGridEditorType,
  PbGridFilterOperator,
  PbGridFixedPosition,
  PbGridFormat,
  PbGridGroupInterval,
  PbGridGroupRowContext,
  PbGridSortOrder,
  PbGridSummaryType,
  PbGridTextAlign,
  splitWords,
} from './grid-model';

/** Custom cell content: <ng-template pbGridCell let-item let-value="value" let-text="text">. */
@Directive({ selector: 'ng-template[pbGridCell]' })
export class PbGridCellTemplate {
  readonly template = inject<TemplateRef<PbGridCellContext>>(TemplateRef);
  static ngTemplateContextGuard(_dir: PbGridCellTemplate, ctx: unknown): ctx is PbGridCellContext<any> {
    return true;
  }
}

/** Custom header content: <ng-template pbGridHeader>. */
@Directive({ selector: 'ng-template[pbGridHeader]' })
export class PbGridHeaderTemplate {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Custom editor: <ng-template pbGridEdit let-ctx> with ctx.value and ctx.setValue(v). */
@Directive({ selector: 'ng-template[pbGridEdit]' })
export class PbGridEditTemplate {
  readonly template = inject<TemplateRef<PbGridEditContext>>(TemplateRef);
  static ngTemplateContextGuard(_dir: PbGridEditTemplate, ctx: unknown): ctx is PbGridEditContext<any> {
    return true;
  }
}

/** Master-detail content under an expanded row: <ng-template pbGridDetail let-item>. */
@Directive({ selector: 'ng-template[pbGridDetail]' })
export class PbGridDetailTemplate {
  readonly template = inject<TemplateRef<{ $implicit: any }>>(TemplateRef);
  static ngTemplateContextGuard(_dir: PbGridDetailTemplate, ctx: unknown): ctx is { $implicit: any } {
    return true;
  }
}

/** A full-width line under every row: <ng-template pbGridPreview let-item>. */
@Directive({ selector: 'ng-template[pbGridPreview]' })
export class PbGridPreviewTemplate {
  readonly template = inject<TemplateRef<{ $implicit: any }>>(TemplateRef);
  static ngTemplateContextGuard(_dir: PbGridPreviewTemplate, ctx: unknown): ctx is { $implicit: any } {
    return true;
  }
}

/** Group row content: <ng-template pbGridGroupRow let-group>. */
@Directive({ selector: 'ng-template[pbGridGroupRow]' })
export class PbGridGroupRowTemplate {
  readonly template = inject<TemplateRef<PbGridGroupRowContext>>(TemplateRef);
  static ngTemplateContextGuard(_dir: PbGridGroupRowTemplate, ctx: unknown): ctx is PbGridGroupRowContext {
    return true;
  }
}

/** Shown when there are no rows: <ng-template pbGridEmpty>. */
@Directive({ selector: 'ng-template[pbGridEmpty]' })
export class PbGridEmptyTemplate {
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/** Replaces the edit form (editForm and popupEditForm modes): <ng-template pbGridEditForm let-ctx>. */
@Directive({ selector: 'ng-template[pbGridEditForm]' })
export class PbGridEditFormTemplate {
  readonly template = inject<TemplateRef<PbGridEditFormContext>>(TemplateRef);
  static ngTemplateContextGuard(_dir: PbGridEditFormTemplate, ctx: unknown): ctx is PbGridEditFormContext<any> {
    return true;
  }
}

/** Toolbar content, projected above the grid: <div pbGridToolbar>…</div>. */
@Directive({ selector: '[pbGridToolbar]' })
export class PbGridToolbar {}

export type PbGridColumnKind = 'data' | 'band' | 'selection' | 'command';

let columnCounter = 0;

/**
 * A grid column (pb-grid-column, bound to `field` or computed by `calculate`), a header band
 * (pb-grid-band, around columns), a selection column (pb-grid-selection-column) or a command column
 * (pb-grid-command-column: New / Edit / Delete). Inputs are initial values: the user's sorting,
 * grouping, resizing, reordering and hiding change the column's current state, and an input only
 * overrides that state when its value changes.
 */
@Directive({
  selector: 'pb-grid-column, pb-grid-band, pb-grid-selection-column, pb-grid-command-column',
  host: { style: 'display: none' },
})
export class PbGridColumn {
  readonly field = input<string>();
  /** Stable key for layout, API calls and summaries (defaults to `field`). */
  readonly name = input<string>();
  readonly caption = input<string>();
  /** CSS width, e.g. 120px or 20%. */
  readonly width = input<string>();
  readonly minWidth = input(60, { transform: numberAttribute });
  readonly visible = input(true, { transform: booleanAttribute });
  readonly visibleIndex = input(-1, { transform: numberAttribute });
  readonly format = input<PbGridFormat>();
  readonly dataType = input<PbGridDataType>();
  readonly textAlign = input<PbGridTextAlign>('auto');
  readonly allowSort = input(true, { transform: booleanAttribute });
  readonly sortOrder = input<PbGridSortOrder>('none');
  readonly sortIndex = input(-1, { transform: numberAttribute });
  readonly allowGroup = input(true, { transform: booleanAttribute });
  readonly groupIndex = input(-1, { transform: numberAttribute });
  readonly groupInterval = input<PbGridGroupInterval>('value');
  /** With groupInterval="custom": maps a value to its group key (also the group's text). */
  readonly groupKey = input<(value: unknown) => unknown>();
  readonly allowFilter = input(true, { transform: booleanAttribute });
  readonly filterValue = input<string>();
  readonly filterOperator = input<PbGridFilterOperator>();
  readonly showInColumnChooser = input(true, { transform: booleanAttribute });
  readonly fixed = input<PbGridFixedPosition>('none');
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly searchable = input(true, { transform: booleanAttribute });
  readonly exportable = input(true, { transform: booleanAttribute });
  /** Adaptivity: with a narrow grid, columns with higher values hide first (0 never hides). */
  readonly adaptivePriority = input(0, { transform: numberAttribute });
  readonly editor = input<PbGridEditorType>('auto');
  /** Values for a select editor (and the filter row's list). */
  readonly items = input<readonly unknown[]>();
  /** Unbound column: computes the value from the row. */
  readonly calculate = input<(item: any) => unknown>();
  readonly cssClass = input<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly min = input<number>();
  readonly max = input<number>();
  readonly maxLength = input<number>();
  readonly pattern = input<RegExp>();
  /** Custom validation: return an error message, or null. */
  readonly validate = input<(value: unknown, item: any) => string | null>();
  // selection column
  readonly allowSelectAll = input(true, { transform: booleanAttribute });
  // command column
  readonly newButton = input(true, { transform: booleanAttribute });
  readonly editButton = input(true, { transform: booleanAttribute });
  readonly deleteButton = input(true, { transform: booleanAttribute });

  readonly cellTemplate = contentChild(PbGridCellTemplate, { descendants: false });
  readonly headerTemplate = contentChild(PbGridHeaderTemplate, { descendants: false });
  readonly editTemplate = contentChild(PbGridEditTemplate, { descendants: false });

  readonly kind: PbGridColumnKind;
  readonly order = columnCounter++;
  /** The band this column is declared in. */
  readonly band = inject(PbGridColumn, { optional: true, skipSelf: true });

  // ------------------------------------------------------------------ current (user) state
  readonly currentVisible = linkedSignal(() => this.visible());
  readonly currentVisibleIndex = linkedSignal(() => (this.visibleIndex() >= 0 ? this.visibleIndex() : this.order));
  readonly currentWidth = linkedSignal<string | null>(() => this.width() ?? (this.kind === 'selection' ? '56px' : this.kind === 'command' ? '136px' : null));
  readonly currentSort = linkedSignal<PbGridSortOrder>(() => this.sortOrder());
  readonly currentSortIndex = linkedSignal(() => this.sortIndex());
  readonly currentGroupIndex = linkedSignal(() => this.groupIndex());
  readonly currentFixed = linkedSignal<PbGridFixedPosition>(() => this.fixed());
  readonly filterRowText = linkedSignal<string | null>(() => this.filterValue() ?? null);
  readonly filterRowOperator = linkedSignal<PbGridFilterOperator | null>(() => this.filterOperator() ?? null);
  readonly filterValues = signal<unknown[] | null>(null);
  /** Hidden by adaptivity (its value moves to the row's adaptive detail). */
  readonly adaptiveHidden = signal(false);

  constructor() {
    const tag = (inject(ElementRef).nativeElement as HTMLElement).tagName.toLowerCase();
    this.kind = tag === 'pb-grid-band' ? 'band' : tag === 'pb-grid-selection-column' ? 'selection' : tag === 'pb-grid-command-column' ? 'command' : 'data';
  }

  get key(): string {
    return this.name() ?? this.field() ?? `column${this.order}`;
  }

  /** The field filters, sorting and summaries refer to. */
  get filterField(): string {
    return this.field() ?? this.key;
  }

  get displayCaption(): string {
    const field = this.field();
    return this.caption() ?? (field ? splitWords(field.split('.').pop()!) : '');
  }

  get isData(): boolean {
    return this.kind === 'data' && (!!this.field() || !!this.calculate());
  }

  get canSort(): boolean {
    return this.isData && this.allowSort();
  }

  get canGroup(): boolean {
    return this.isData && this.allowGroup();
  }

  get canFilter(): boolean {
    return this.isData && this.allowFilter();
  }

  get canEdit(): boolean {
    return this.isData && !this.readOnly() && !this.calculate() && !!this.field();
  }
}

/**
 * A total summary (in the footer) or, with `group`, a group summary (in group rows, or in group
 * footers when `footerColumn` is set).
 */
@Directive({ selector: 'pb-grid-summary', host: { style: 'display: none' } })
export class PbGridSummary {
  readonly type = input<PbGridSummaryType>('count');
  readonly field = input<string>();
  readonly group = input(false, { transform: booleanAttribute });
  /** The column whose footer cell shows the summary (defaults to the field's column). */
  readonly footerColumn = input<string>();
  /** The whole text: {0} is the summary name, {1} the value. Default "Sum: {1}". */
  readonly displayText = input<string>();
  /** Format of the value (defaults to the column's format). */
  readonly format = input<PbGridFormat>();
  readonly name = input<string>();
  readonly visible = input(true, { transform: booleanAttribute });
}
