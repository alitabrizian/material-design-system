import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { PbCheckbox } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-checkbox-page',
  imports: [PageHeader, ExampleCard, PbCheckbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkbox-page.html',
})
export class CheckboxPage {
  // #region preferences
  protected readonly newsletter = signal(true);
  protected readonly offers = signal(false);
  // #endregion

  // #region indeterminate
  protected readonly toppings = signal([
    { name: 'Pepperoni', checked: true },
    { name: 'Mushrooms', checked: false },
    { name: 'Olives', checked: false },
  ]);
  protected readonly allChecked = computed(() => this.toppings().every((t) => t.checked));
  protected readonly someChecked = computed(() => this.toppings().some((t) => t.checked) && !this.allChecked());

  protected setAll(checked: boolean): void {
    this.toppings.update((list) => list.map((t) => ({ ...t, checked })));
  }

  protected setOne(name: string, checked: boolean): void {
    this.toppings.update((list) => list.map((t) => (t.name === name ? { ...t, checked } : t)));
  }
  // #endregion
}
