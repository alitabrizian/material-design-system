import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { PbOption, PbSelect } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-select-page',
  imports: [PageHeader, ExampleCard, PbOption, PbSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './select-page.html',
})
export class SelectPage {
  // #region basic
  protected readonly foods = [
    { value: 'steak', label: 'Steak' },
    { value: 'pizza', label: 'Pizza' },
    { value: 'tacos', label: 'Tacos' },
  ];
  protected readonly food = signal<unknown>(null);
  // #endregion

  // #region states
  protected readonly car = signal<unknown>(null);
  protected readonly carError = computed(() => (this.car() ? undefined : 'Please choose a car'));
  // #endregion
}
