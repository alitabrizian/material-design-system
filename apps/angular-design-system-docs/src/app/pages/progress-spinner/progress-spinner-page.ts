import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbProgressSpinner, PbSlider } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-progress-spinner-page',
  imports: [PageHeader, ExampleCard, PbProgressSpinner, PbSlider],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress-spinner-page.html',
})
export class ProgressSpinnerPage {
  // #region determinate
  protected readonly value = signal(70);
  // #endregion
}
