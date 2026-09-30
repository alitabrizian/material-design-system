import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbSlideToggle } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-slide-toggle-page',
  imports: [PageHeader, ExampleCard, PbSlideToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slide-toggle-page.html',
})
export class SlideTogglePage {
  // #region dark-mode
  protected readonly darkMode = signal(false);
  // #endregion
}
