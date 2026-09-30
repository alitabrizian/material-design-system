import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PbDivider, PbList, PbListItem } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-divider-page',
  imports: [PageHeader, ExampleCard, PbDivider, PbList, PbListItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './divider-page.html',
})
export class DividerPage {}
