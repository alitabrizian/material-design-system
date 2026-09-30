import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-core-page',
  imports: [PageHeader, ExampleCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './core-page.html',
})
export class CorePage {
  protected readonly typescale = ['display-small', 'headline-small', 'title-large', 'title-medium', 'body-large', 'body-medium', 'label-large'];
  protected readonly roles = [
    'primary', 'on-primary', 'primary-container', 'on-primary-container',
    'secondary', 'secondary-container', 'tertiary', 'tertiary-container',
    'error', 'error-container', 'surface', 'surface-container', 'surface-container-highest', 'outline',
  ];
}
