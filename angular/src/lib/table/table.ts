import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChildren, effect, input, output, TemplateRef, viewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
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
import { PbCell } from './cell';

export interface PbTableColumn {
  /** Property of each row shown in this column (and the key for a custom pbCell template). */
  key: string;
  header: string;
  /** Adds a sort header (PBSortHeader) to the column. */
  sortable?: boolean;
}

export type PbSortDirection = 'none' | 'ascending' | 'descending';

export interface PbSortEvent {
  key: string;
  direction: PbSortDirection;
}

/**
 * Material 3 data table (PBTable). Sortable columns and pagination (pageSize) run on the client; listen
 * to (sortChange) to sort on the server instead and pass the sorted rows back.
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
    MatPaginator,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './table.html',
  styleUrl: './table.css',
})
export class PbTable<T extends object = Record<string, unknown>> {
  readonly data = input<readonly T[]>([]);
  readonly columns = input<readonly PbTableColumn[]>([]);
  /** Rows per page; 0 shows every row without a paginator. */
  readonly pageSize = input(0);
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 20]);
  readonly sortChange = output<PbSortEvent>();

  protected readonly dataSource = new MatTableDataSource<T>([]);
  protected readonly columnKeys = computed(() => this.columns().map((column) => column.key));
  private readonly cells = contentChildren(PbCell);
  private readonly sort = viewChild.required(MatSort);
  private readonly paginator = viewChild(MatPaginator);

  constructor() {
    effect(() => {
      this.dataSource.data = [...this.data()];
    });
    effect(() => {
      this.dataSource.sort = this.sort();
      this.dataSource.paginator = this.paginator() ?? null;
    });
  }

  protected cellTemplate(key: string): TemplateRef<unknown> | undefined {
    return this.cells().find((cell) => cell.key() === key)?.template;
  }

  protected cellValue(row: T, key: string): unknown {
    return (row as Record<string, unknown>)[key];
  }

  protected onSort(sort: Sort): void {
    this.sortChange.emit({ key: sort.active, direction: toPbDirection(sort.direction) });
  }
}

function toPbDirection(direction: SortDirection): PbSortDirection {
  return direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
}
