import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  Directive,
  effect,
  input,
  model,
  output,
  TemplateRef,
  inject,
  viewChild,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatChip, MatChipAvatar, MatChipOption, MatChipRemove, MatChipSet } from '@angular/material/chips';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelActionRow,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import {
  MatList,
  MatListItem,
  MatListItemAvatar,
  MatListItemIcon,
  MatListItemLine,
  MatListItemMeta,
  MatListItemTitle,
  MatNavList,
} from '@angular/material/list';
import { MatSort, MatSortHeader, Sort, SortDirection } from '@angular/material/sort';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableDataSource,
} from '@angular/material/table';
import {
  MatTree,
  MatTreeNode,
  MatTreeNodeDef,
  MatTreeNodePadding,
  MatTreeNodeToggle,
} from '@angular/material/tree';
import { PB_CONTENT_TEMPLATE, PbContentTemplate } from '../core/content-template';

// ----------------------------------------------------------------------------------------- chips

export type PbChipVariant = 'assist' | 'filter' | 'input';

/**
 * One chip of a pb-chips (PBChip). assist = action chip, filter = toggleable ([(selected)]),
 * input = removable entry ((removed)).
 */
@Component({
  selector: 'pb-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PB_CONTENT_TEMPLATE,
})
export class PbChip extends PbContentTemplate {
  readonly variant = input<PbChipVariant>('assist');
  readonly icon = input<string>();
  readonly selected = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly highlighted = input(false, { transform: booleanAttribute });
  readonly removed = output<void>();
  readonly chipClick = output<MouseEvent>();
}

/** A set of pb-chip children (PBChips). */
@Component({
  selector: 'pb-chips',
  imports: [MatChipSet, MatChip, MatChipOption, MatChipAvatar, MatChipRemove, MatIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `
    <mat-chip-set>
      @for (chip of chips(); track chip) {
        @switch (chip.variant()) {
          @case ('filter') {
            <mat-chip-option
              [selected]="chip.selected()"
              [disabled]="chip.disabled()"
              [highlighted]="chip.highlighted()"
              (selectionChange)="chip.selected.set($event.selected)"
            >
              @if (chip.icon(); as name) { <mat-icon matChipAvatar>{{ name }}</mat-icon> }
              <ng-container [ngTemplateOutlet]="chip.template()" />
            </mat-chip-option>
          }
          @case ('input') {
            <mat-chip [disabled]="chip.disabled()" [highlighted]="chip.highlighted()" (removed)="chip.removed.emit()">
              @if (chip.icon(); as name) { <mat-icon matChipAvatar>{{ name }}</mat-icon> }
              <ng-container [ngTemplateOutlet]="chip.template()" />
              <button matChipRemove aria-label="Remove"><mat-icon>cancel</mat-icon></button>
            </mat-chip>
          }
          @default {
            <mat-chip [disabled]="chip.disabled()" [highlighted]="chip.highlighted()" (click)="chip.chipClick.emit($event)">
              @if (chip.icon(); as name) { <mat-icon matChipAvatar>{{ name }}</mat-icon> }
              <ng-container [ngTemplateOutlet]="chip.template()" />
            </mat-chip>
          }
        }
      }
    </mat-chip-set>
  `,
})
export class PbChips {
  protected readonly chips = contentChildren(PbChip);
}

// ------------------------------------------------------------------------------------- expansion

/** Groups pb-expansion-panel children so that only one is open at a time (PBAccordion). */
@Directive({
  selector: 'pb-accordion',
  host: { style: 'display: block' },
  hostDirectives: [{ directive: MatAccordion, inputs: ['multi', 'hideToggle', 'displayMode', 'togglePosition'] }],
})
export class PbAccordion {}

/**
 * Material expansion panel (PBExpansionPanel). The content is the body; [pbPanelActions] elements go
 * in the action row.
 */
@Component({
  selector: 'pb-expansion-panel',
  imports: [
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    MatExpansionPanelActionRow,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `
    <mat-expansion-panel [(expanded)]="expanded" [disabled]="disabled()" [hideToggle]="hideToggle()">
      <mat-expansion-panel-header>
        <mat-panel-title>{{ title() }}</mat-panel-title>
        @if (description(); as text) {
          <mat-panel-description>{{ text }}</mat-panel-description>
        }
      </mat-expansion-panel-header>
      <ng-content />
      @if (hasActions()) {
        <mat-action-row><ng-content select="[pbPanelActions]" /></mat-action-row>
      }
    </mat-expansion-panel>
  `,
})
export class PbExpansionPanel {
  readonly title = input('');
  readonly description = input<string>();
  readonly expanded = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly hideToggle = input(false, { transform: booleanAttribute });
  /** Shows the action row that holds the [pbPanelActions] content. */
  readonly hasActions = input(false, { transform: booleanAttribute });
}

// ------------------------------------------------------------------------------------------ list

/**
 * One row of a pb-list (PBListItem): up to three lines, a leading icon or avatar, trailing meta text.
 * With href the list renders it as a link; otherwise (clicked) fires on click.
 */
@Directive({ selector: 'pb-list-item' })
export class PbListItem {
  readonly title = input('');
  readonly subtitle = input<string>();
  readonly line3 = input<string>();
  readonly icon = input<string>();
  /** Image URL for a leading avatar. */
  readonly avatar = input<string>();
  readonly meta = input<string>();
  readonly href = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly selected = input(false, { transform: booleanAttribute });
  readonly clicked = output<void>();
}

/**
 * Material 3 list (PBList) of pb-list-item children; a nav list when any item has an href. The row
 * parts are written out in each branch (not shared through a template outlet) because mat-list-item
 * slots its icon, title, lines and meta by content projection, which only sees direct children.
 */
@Component({
  selector: 'pb-list',
  imports: [
    MatList,
    MatNavList,
    MatListItem,
    MatListItemTitle,
    MatListItemLine,
    MatListItemIcon,
    MatListItemAvatar,
    MatListItemMeta,
    MatIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; } .pb-list-item__avatar { object-fit: cover; }',
  template: `
    @if (nav()) {
      <mat-nav-list>
        @for (item of items(); track item) {
          <a mat-list-item [attr.href]="item.href()" [activated]="item.selected()" [disabled]="item.disabled()"
             (click)="item.clicked.emit()">
            @if (item.icon(); as name) { <mat-icon matListItemIcon>{{ name }}</mat-icon> }
            @if (item.avatar(); as src) { <img matListItemAvatar class="pb-list-item__avatar" [src]="src" alt="" /> }
            <span matListItemTitle>{{ item.title() }}</span>
            @if (item.subtitle(); as text) { <span matListItemLine>{{ text }}</span> }
            @if (item.line3(); as text) { <span matListItemLine>{{ text }}</span> }
            @if (item.meta(); as text) { <span matListItemMeta>{{ text }}</span> }
          </a>
        }
      </mat-nav-list>
    } @else {
      <mat-list>
        @for (item of items(); track item) {
          <mat-list-item [activated]="item.selected()" [disabled]="item.disabled()" (click)="item.clicked.emit()">
            @if (item.icon(); as name) { <mat-icon matListItemIcon>{{ name }}</mat-icon> }
            @if (item.avatar(); as src) { <img matListItemAvatar class="pb-list-item__avatar" [src]="src" alt="" /> }
            <span matListItemTitle>{{ item.title() }}</span>
            @if (item.subtitle(); as text) { <span matListItemLine>{{ text }}</span> }
            @if (item.line3(); as text) { <span matListItemLine>{{ text }}</span> }
            @if (item.meta(); as text) { <span matListItemMeta>{{ text }}</span> }
          </mat-list-item>
        }
      </mat-list>
    }
  `,
})
export class PbList {
  protected readonly items = contentChildren(PbListItem);
  protected readonly nav = computed(() => this.items().some((item) => item.href() !== undefined));
}

// ----------------------------------------------------------------------------------------- table

export interface PbTableColumn {
  /** Property of each row shown in this column (and the key for a custom pbCell template). */
  key: string;
  header: string;
  sortable?: boolean;
}

export type PbSortDirection = 'none' | 'ascending' | 'descending';

export interface PbSortEvent {
  key: string;
  direction: PbSortDirection;
}

/** Custom cell template for one pb-table column: <ng-template pbCell="price" let-row>...</ng-template> */
@Directive({ selector: 'ng-template[pbCell]' })
export class PbCell {
  readonly key = input.required<string>({ alias: 'pbCell' });
  readonly template = inject(TemplateRef);
}

/**
 * Material 3 data table (PBTable), sortable per column (PBSortHeader). Rows are sorted in place on the
 * client; listen to (sortChange) to sort on the server instead and pass the sorted rows back.
 */
@Component({
  selector: 'pb-table',
  imports: [
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatSort,
    MatSortHeader,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; overflow: auto; } table { width: 100%; }',
  template: `
    <table mat-table [dataSource]="dataSource" matSort (matSortChange)="onSort($event)">
      @for (column of columns(); track column.key) {
        <ng-container [matColumnDef]="column.key">
          <th mat-header-cell *matHeaderCellDef mat-sort-header [disabled]="!column.sortable">{{ column.header }}</th>
          <td mat-cell *matCellDef="let row">
            @if (cellTemplate(column.key); as template) {
              <ng-container [ngTemplateOutlet]="template" [ngTemplateOutletContext]="{ $implicit: row }" />
            } @else {
              {{ row[column.key] }}
            }
          </td>
        </ng-container>
      }
      <tr mat-header-row *matHeaderRowDef="columnKeys()"></tr>
      <tr mat-row *matRowDef="let row; columns: columnKeys()"></tr>
    </table>
  `,
})
export class PbTable<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly data = input<readonly T[]>([]);
  readonly columns = input<readonly PbTableColumn[]>([]);
  readonly sortChange = output<PbSortEvent>();

  protected readonly dataSource = new MatTableDataSource<T>([]);
  protected readonly columnKeys = computed(() => this.columns().map((column) => column.key));
  private readonly cells = contentChildren(PbCell);
  private readonly sort = viewChild.required(MatSort);

  constructor() {
    effect(() => {
      this.dataSource.data = [...this.data()];
    });
    effect(() => {
      this.dataSource.sort = this.sort();
    });
  }

  protected cellTemplate(key: string): TemplateRef<unknown> | undefined {
    return this.cells().find((cell) => cell.key() === key)?.template;
  }

  protected onSort(sort: Sort): void {
    this.sortChange.emit({ key: sort.active, direction: toPbDirection(sort.direction) });
  }
}

function toPbDirection(direction: SortDirection): PbSortDirection {
  return direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
}

// ------------------------------------------------------------------------------------------ tree

export interface PbTreeNode {
  label: string;
  icon?: string;
  children?: readonly PbTreeNode[];
}

/** Material 3 tree (PBTree) of nested PbTreeNode data. */
@Component({
  selector: 'pb-tree',
  imports: [MatTree, MatTreeNode, MatTreeNodeDef, MatTreeNodePadding, MatTreeNodeToggle, MatIconButton, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; }
    .pb-tree__spacer { display: inline-block; width: 48px; }
    mat-icon.pb-tree__icon { margin-inline-end: 8px; }
  `,
  template: `
    <mat-tree #tree [dataSource]="data()" [childrenAccessor]="childrenAccessor">
      <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding [isExpandable]="hasChildren(node)">
        @if (hasChildren(node)) {
          <button matIconButton matTreeNodeToggle [attr.aria-label]="'Toggle ' + node.label">
            <mat-icon>{{ tree.isExpanded(node) ? 'expand_more' : 'chevron_right' }}</mat-icon>
          </button>
        } @else {
          <span class="pb-tree__spacer"></span>
        }
        @if (node.icon) { <mat-icon class="pb-tree__icon">{{ node.icon }}</mat-icon> }
        {{ node.label }}
      </mat-tree-node>
    </mat-tree>
  `,
})
export class PbTree {
  readonly nodes = input<readonly PbTreeNode[]>([]);

  protected readonly data = computed(() => [...this.nodes()]);

  protected readonly childrenAccessor = (node: PbTreeNode): PbTreeNode[] => [...(node.children ?? [])];

  protected hasChildren(node: PbTreeNode): boolean {
    return !!node.children?.length;
  }
}
