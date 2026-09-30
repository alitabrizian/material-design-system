import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbAccordion, PbButton, PbExpansionPanel, PbInput } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-expansion-panel-page',
  imports: [PageHeader, ExampleCard, PbAccordion, PbButton, PbExpansionPanel, PbInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './expansion-panel-page.html',
})
export class ExpansionPanelPage {
  // #region basic
  protected readonly firstOpen = signal(true);
  // #endregion

  // #region accordion
  protected readonly step = signal(0);
  // #endregion
}
