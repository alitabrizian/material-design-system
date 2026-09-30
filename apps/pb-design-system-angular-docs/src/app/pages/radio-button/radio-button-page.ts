import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbRadioButton, PbRadioGroup } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-radio-button-page',
  imports: [PageHeader, ExampleCard, PbRadioButton, PbRadioGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './radio-button-page.html',
})
export class RadioButtonPage {
  // #region delivery
  protected readonly speed = signal<unknown>('standard');
  // #endregion
}
