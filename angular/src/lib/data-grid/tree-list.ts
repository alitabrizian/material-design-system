import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output, ViewEncapsulation } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatProgressBar } from '@angular/material/progress-bar';
import { PbDialog } from '../dialog/dialog';
import { PbPaginator } from '../paginator/paginator';
import { PbDataGrid } from './data-grid';
import { PbGridTreeConfig, PbTreeListFilterTreeMode, PbTreeListNodeExpandedEvent } from './grid-model';

/**
 * Material 3 tree list (DevExpress TreeList): a pb-data-grid whose rows form a hierarchy, with an expand
 * button and indent in the first data column (or `treeColumn`). Bind flat data with `keyField` +
 * `parentKeyField`, nested data with `childrenField`, or load children on demand with `hasChildrenField` +
 * `loadChildren`. Every grid feature works on the tree: sorting (among siblings), filter row, menus, panel
 * and search (with `filterTreeMode`), editing (including new child rows), summaries, selection (optionally
 * recursive), focus, columns, bands, export, layout, context menus, paging, virtual scrolling and drag and
 * drop (before, after or inside a node). Grouping is off.
 */
@Component({
  selector: 'pb-tree-list',
  imports: [NgTemplateOutlet, MatButton, MatIconButton, MatCheckbox, MatProgressBar, PbDialog, PbPaginator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.css',
})
export class PbTreeList<T = any> extends PbDataGrid<T> {
  /** Flat data: the field holding the parent's key (null, missing or `rootValue` = root). */
  readonly parentKeyField = input<string>();
  /** Nested data: the field holding the item's children array. */
  readonly childrenField = input<string>();
  /** A boolean field: true when the item has children to load on demand. */
  readonly hasChildrenField = input<string>();
  /** Flat data: the parent key value of root nodes besides null (e.g. 0). */
  readonly rootValue = input<unknown>(null);
  /** Loads a node's children when it is first expanded. */
  readonly loadChildren = input<(parent: T) => Promise<readonly T[]>>();
  /** Every node starts expanded. */
  readonly autoExpandAllNodes = input(false, { transform: booleanAttribute });
  /** Which nodes stay visible while a filter or search is active. */
  readonly filterTreeMode = input<PbTreeListFilterTreeMode>('parentBranch');
  /** Checking a node checks its whole branch; a parent is checked when all its children are. */
  readonly recursiveSelection = input(false, { transform: booleanAttribute });
  /** The column (key or field) that shows the expand buttons; default: the first data column. */
  readonly treeColumn = input<string>();
  /** A node was expanded or collapsed. */
  readonly rowExpandedChange = output<PbTreeListNodeExpandedEvent<T>>();

  protected override readonly treeConfig = computed<PbGridTreeConfig<T>>(() => ({
    parentKeyField: this.parentKeyField(),
    childrenField: this.childrenField(),
    hasChildrenField: this.hasChildrenField(),
    rootValue: this.rootValue(),
    loadChildren: this.loadChildren(),
    autoExpandAllNodes: this.autoExpandAllNodes(),
    filterTreeMode: this.filterTreeMode(),
    recursiveSelection: this.recursiveSelection(),
    treeColumn: this.treeColumn(),
    expandedChange: (e) => this.rowExpandedChange.emit(e),
  }));
}
