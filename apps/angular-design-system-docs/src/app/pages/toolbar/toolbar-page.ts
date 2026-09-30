import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PbButton, PbToolbar } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-toolbar-page',
  imports: [PageHeader, ExampleCard, PbButton, PbToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toolbar-page.html',
})
export class ToolbarPage {}
