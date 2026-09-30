import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PbButton, PbIcon } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-icon-page',
  imports: [PageHeader, ExampleCard, PbButton, PbIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon-page.html',
})
export class IconPage {}
