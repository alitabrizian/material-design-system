import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbAutocomplete, PbAutocompleteFilter, PbOption } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-autocomplete-page',
  imports: [PageHeader, ExampleCard, PbAutocomplete, PbOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './autocomplete-page.html',
})
export class AutocompletePage {
  protected readonly options = ['One', 'Two', 'Three'];
  protected readonly states = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut'];

  // #region simple
  protected readonly simple = signal('');
  // #endregion

  // #region custom-filter
  protected readonly state = signal('');
  /** Suggests only the states that start with the typed text. */
  protected readonly startsWith: PbAutocompleteFilter = (value, text) =>
    value.toLowerCase().startsWith(text.toLowerCase());
  // #endregion

  // #region require-selection
  protected readonly required = signal('');
  // #endregion
}
