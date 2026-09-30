import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { PbInput } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-input-page',
  imports: [PageHeader, ExampleCard, PbInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './input-page.html',
})
export class InputPage {
  // #region default
  protected readonly name = signal('');
  // #endregion

  // #region error
  protected readonly email = signal('invalid-email');
  protected readonly emailError = computed(() =>
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email()) ? undefined : 'Please enter a valid email address',
  );
  // #endregion
}
