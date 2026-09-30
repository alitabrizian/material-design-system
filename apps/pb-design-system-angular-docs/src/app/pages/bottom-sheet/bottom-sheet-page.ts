import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbBottomSheet, PbButton, PbList, PbListItem } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-bottom-sheet-page',
  imports: [PageHeader, ExampleCard, PbBottomSheet, PbButton, PbList, PbListItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bottom-sheet-page.html',
})
export class BottomSheetPage {
  // #region overview
  protected readonly open = signal(false);
  protected readonly picked = signal('nothing yet');

  protected pick(app: string): void {
    this.picked.set(app);
    this.open.set(false);
  }
  // #endregion
}
