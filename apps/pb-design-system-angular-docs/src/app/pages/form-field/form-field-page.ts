import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PbButton, PbIcon, PbInput, PbOption, PbPrefix, PbSelect, PbSuffix } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-form-field-page',
  imports: [PageHeader, ExampleCard, PbButton, PbIcon, PbInput, PbOption, PbPrefix, PbSelect, PbSuffix],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form-field-page.html',
})
export class FormFieldPage {}
