import { booleanAttribute, ChangeDetectionStrategy, Component, effect, inject, input, model, output } from '@angular/core';
import { MatPaginator, MatPaginatorIntl, PageEvent } from '@angular/material/paginator';

/** Emitted by pb-paginator when the page or page size changes (PBPageEvent). */
export type PbPageEvent = PageEvent;

/** Material 3 paginator (PBPaginator). The labels default to Angular Material's English ones. */
@Component({
  selector: 'pb-paginator',
  imports: [MatPaginator],
  // One MatPaginatorIntl per paginator, so each instance's label inputs stay its own.
  providers: [{ provide: MatPaginatorIntl, useFactory: () => new MatPaginatorIntl() }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paginator.html',
  styleUrl: '../core/block.css',
})
export class PbPaginator {
  readonly length = input(0);
  readonly pageIndex = model(0);
  readonly pageSize = model(10);
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 25, 100]);
  readonly showFirstLastButtons = input(false, { transform: booleanAttribute });
  readonly hidePageSize = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly itemsPerPageLabel = input('Items per page:');
  readonly firstPageLabel = input('First page');
  readonly previousPageLabel = input('Previous page');
  readonly nextPageLabel = input('Next page');
  readonly lastPageLabel = input('Last page');
  readonly page = output<PbPageEvent>();

  private readonly intl = inject(MatPaginatorIntl);

  constructor() {
    effect(() => {
      this.intl.itemsPerPageLabel = this.itemsPerPageLabel();
      this.intl.firstPageLabel = this.firstPageLabel();
      this.intl.previousPageLabel = this.previousPageLabel();
      this.intl.nextPageLabel = this.nextPageLabel();
      this.intl.lastPageLabel = this.lastPageLabel();
      this.intl.changes.next();
    });
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.page.emit(event);
  }
}
