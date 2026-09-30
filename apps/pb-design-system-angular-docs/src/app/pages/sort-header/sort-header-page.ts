import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbSortEvent, PbTable, PbTableColumn } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-sort-header-page',
  imports: [PageHeader, ExampleCard, PbTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sort-header-page.html',
})
export class SortHeaderPage {
  // #region overview
  protected readonly columns: PbTableColumn[] = [
    { key: 'name', header: 'Dessert (100g)', sortable: true },
    { key: 'calories', header: 'Calories', sortable: true },
    { key: 'fat', header: 'Fat (g)', sortable: true },
    { key: 'carbs', header: 'Carbs (g)', sortable: true },
    { key: 'protein', header: 'Protein (g)', sortable: true },
  ];
  protected readonly desserts = [
    { name: 'Frozen yogurt', calories: 159, fat: 6, carbs: 24, protein: 4 },
    { name: 'Ice cream sandwich', calories: 237, fat: 9, carbs: 37, protein: 4 },
    { name: 'Eclair', calories: 262, fat: 16, carbs: 24, protein: 6 },
    { name: 'Cupcake', calories: 305, fat: 4, carbs: 67, protein: 4 },
    { name: 'Gingerbread', calories: 356, fat: 16, carbs: 49, protein: 4 },
  ];
  protected readonly sort = signal<PbSortEvent | null>(null);
  // #endregion
}
