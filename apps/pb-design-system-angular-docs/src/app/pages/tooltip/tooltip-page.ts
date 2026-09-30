import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PbButton, PbTooltip, PbTooltipPosition } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-tooltip-page',
  imports: [PageHeader, ExampleCard, PbButton, PbTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tooltip-page.html',
})
export class TooltipPage {
  // #region positions
  protected readonly positions: PbTooltipPosition[] = ['above', 'below', 'before', 'after'];
  // #endregion
}
