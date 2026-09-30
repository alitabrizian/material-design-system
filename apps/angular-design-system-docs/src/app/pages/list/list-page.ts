import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbDivider, PbList, PbListItem } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-list-page',
  imports: [PageHeader, ExampleCard, PbDivider, PbList, PbListItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list-page.html',
})
export class ListPage {
  // #region sections
  protected readonly folders = [
    { name: 'Photos', updated: 'Jan 1, 2026' },
    { name: 'Recipes', updated: 'Jan 17, 2026' },
    { name: 'Work', updated: 'Jan 28, 2026' },
  ];
  protected readonly notes = [
    { name: 'Vacation Itinerary', updated: 'Feb 20, 2026' },
    { name: 'Kitchen Remodel', updated: 'Jan 18, 2026' },
  ];
  // #endregion

  // #region actions
  protected readonly clicked = signal('nothing');
  // #endregion
}
