import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbButtonToggle, PbButtonToggleGroup } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-button-toggle-page',
  imports: [PageHeader, ExampleCard, PbButtonToggle, PbButtonToggleGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button-toggle-page.html',
})
export class ButtonTogglePage {
  // #region basic
  protected readonly fontStyle = signal<string | null>('bold');
  // #endregion

  // #region selection-mode
  protected readonly alignment = signal<string | null>('left');
  protected readonly formats = signal<readonly string[]>(['bold']);
  // #endregion
}
