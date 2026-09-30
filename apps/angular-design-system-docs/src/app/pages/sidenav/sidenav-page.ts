import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbButton, PbList, PbListItem, PbSidenav } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-sidenav-page',
  imports: [PageHeader, ExampleCard, PbButton, PbList, PbListItem, PbSidenav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidenav-page.html',
})
export class SidenavPage {
  // #region side
  protected readonly sideOpen = signal(true);
  // #endregion

  // #region over
  protected readonly overOpen = signal(false);
  // #endregion
}
