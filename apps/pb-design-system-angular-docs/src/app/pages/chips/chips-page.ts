import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbChip, PbChips } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-chips-page',
  imports: [PageHeader, ExampleCard, PbChip, PbChips],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chips-page.html',
})
export class ChipsPage {
  // #region filter
  protected readonly amenities = signal([
    { name: 'Washer / Dryer', selected: true },
    { name: 'Dogs ok', selected: false },
    { name: 'Cats ok', selected: true },
    { name: 'Wheelchair accessible', selected: false },
  ]);

  protected toggle(name: string, selected: boolean): void {
    this.amenities.update((list) => list.map((a) => (a.name === name ? { ...a, selected } : a)));
  }
  // #endregion

  // #region input
  protected readonly tags = signal(['Design', 'Frontend', 'Accessibility', 'Angular']);

  protected remove(tag: string): void {
    this.tags.update((tags) => tags.filter((t) => t !== tag));
  }
  // #endregion

  // #region assist
  protected readonly lastAction = signal('none');
  // #endregion
}
