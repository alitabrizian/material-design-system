import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbTab, PbTabs, PbTabsAlign } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-tabs-page',
  imports: [PageHeader, ExampleCard, PbTab, PbTabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tabs-page.html',
})
export class TabsPage {
  // #region basic
  protected readonly selected = signal(0);
  // #endregion

  // #region icons
  protected readonly align = signal<PbTabsAlign>('center');
  // #endregion
}
