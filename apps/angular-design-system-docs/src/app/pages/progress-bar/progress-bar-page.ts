import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbProgressBar, PbSlider } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-progress-bar-page',
  imports: [PageHeader, ExampleCard, PbProgressBar, PbSlider],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress-bar-page.html',
})
export class ProgressBarPage {
  // #region determinate
  protected readonly progress = signal(40);
  // #endregion
}
