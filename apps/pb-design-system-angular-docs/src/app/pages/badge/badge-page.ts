import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbBadge, PbButton, PbIcon } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-badge-page',
  imports: [PageHeader, ExampleCard, PbBadge, PbButton, PbIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './badge-page.html',
})
export class BadgePage {
  // #region overview
  protected readonly hidden = signal(false);
  // #endregion
}
