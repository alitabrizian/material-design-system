import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbButton, PbSnackbar } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-snackbar-page',
  imports: [PageHeader, ExampleCard, PbButton, PbSnackbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './snackbar-page.html',
})
export class SnackbarPage {
  // #region basic
  protected readonly open = signal(false);
  protected readonly undone = signal(0);
  // #endregion
}
