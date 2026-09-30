import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbCheckbox, PbRipple } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-ripples-page',
  imports: [PageHeader, ExampleCard, PbCheckbox, PbRipple],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ripples-page.html',
})
export class RipplesPage {
  // #region overview
  protected readonly centered = signal(false);
  protected readonly disabled = signal(false);
  protected readonly unbounded = signal(false);
  // #endregion
}
