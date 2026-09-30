import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PbCell, PbTable, PbTableColumn } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

interface PeriodicElement {
  position: number;
  name: string;
  weight: number;
  symbol: string;
}

const ELEMENTS: PeriodicElement[] = [
  { position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H' },
  { position: 2, name: 'Helium', weight: 4.0026, symbol: 'He' },
  { position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li' },
  { position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be' },
  { position: 5, name: 'Boron', weight: 10.811, symbol: 'B' },
  { position: 6, name: 'Carbon', weight: 12.0107, symbol: 'C' },
  { position: 7, name: 'Nitrogen', weight: 14.0067, symbol: 'N' },
  { position: 8, name: 'Oxygen', weight: 15.9994, symbol: 'O' },
  { position: 9, name: 'Fluorine', weight: 18.9984, symbol: 'F' },
  { position: 10, name: 'Neon', weight: 20.1797, symbol: 'Ne' },
  { position: 11, name: 'Sodium', weight: 22.9897, symbol: 'Na' },
  { position: 12, name: 'Magnesium', weight: 24.305, symbol: 'Mg' },
];

@Component({
  selector: 'docs-table-page',
  imports: [PageHeader, ExampleCard, PbCell, PbTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './table-page.html',
})
export class TablePage {
  // #region basic
  protected readonly columns: PbTableColumn[] = [
    { key: 'position', header: 'No.' },
    { key: 'name', header: 'Name' },
    { key: 'weight', header: 'Weight' },
    { key: 'symbol', header: 'Symbol' },
  ];
  protected readonly firstFive = ELEMENTS.slice(0, 5);
  // #endregion

  // #region sorting
  protected readonly sortableColumns: PbTableColumn[] = this.columns.map((column) => ({ ...column, sortable: true }));
  protected readonly elements = ELEMENTS;
  // #endregion
}
