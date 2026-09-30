import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbButton, PbDialog } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-dialog-page',
  imports: [PageHeader, ExampleCard, PbButton, PbDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialog-page.html',
})
export class DialogPage {
  // #region overview
  protected readonly open = signal(false);
  protected readonly result = signal('none');

  protected close(result: string): void {
    this.result.set(result);
    this.open.set(false);
  }
  // #endregion

  // #region required-action
  protected readonly termsOpen = signal(false);
  // #endregion
}
