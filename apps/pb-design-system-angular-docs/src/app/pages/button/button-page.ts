import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbButton, PbTooltip } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-button-page',
  imports: [PageHeader, ExampleCard, PbButton, PbTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button-page.html',
})
export class ButtonPage {
  // #region progress
  protected readonly saving = signal(false);

  protected save(): void {
    this.saving.set(true);
    setTimeout(() => this.saving.set(false), 2000);
  }
  // #endregion
}
