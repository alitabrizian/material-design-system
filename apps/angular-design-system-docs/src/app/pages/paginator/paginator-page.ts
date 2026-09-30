import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbPageEvent, PbPaginator } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-paginator-page',
  imports: [PageHeader, ExampleCard, PbPaginator],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paginator-page.html',
})
export class PaginatorPage {
  // #region configurable
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly lastEvent = signal<PbPageEvent | null>(null);
  // #endregion
}
