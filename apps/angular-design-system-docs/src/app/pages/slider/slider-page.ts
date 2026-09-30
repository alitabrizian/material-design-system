import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbSlider } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-slider-page',
  imports: [PageHeader, ExampleCard, PbSlider],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slider-page.html',
})
export class SliderPage {
  // #region volume
  protected readonly volume = signal(60);
  // #endregion
}
