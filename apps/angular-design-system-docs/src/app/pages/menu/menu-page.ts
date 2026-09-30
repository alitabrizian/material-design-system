import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbMenu, PbMenuItem } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-menu-page',
  imports: [PageHeader, ExampleCard, PbMenu, PbMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-page.html',
})
export class MenuPage {
  // #region icons
  protected readonly lastAction = signal('none');
  protected readonly open = signal(false);
  // #endregion
}
