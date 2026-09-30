import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PbGridList, PbGridTile } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-grid-list-page',
  imports: [PageHeader, ExampleCard, PbGridList, PbGridTile],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grid-list-page.html',
})
export class GridListPage {
  // #region dynamic
  protected readonly tiles = [
    { text: 'One', cols: 3, rows: 1, fill: 1 },
    { text: 'Two', cols: 1, rows: 2, fill: 2 },
    { text: 'Three', cols: 1, rows: 1, fill: 3 },
    { text: 'Four', cols: 2, rows: 1, fill: 4 },
  ];
  // #endregion
}
