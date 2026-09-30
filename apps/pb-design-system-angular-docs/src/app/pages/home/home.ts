import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PbRipple } from '@partobita/design-system-angular';
import { COMPONENT_CATALOG } from '../../component-catalog';

/** Angular Material's components/categories page, as in the Blazor docs. */
@Component({
  selector: 'docs-home',
  imports: [RouterLink, PbRipple],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
})
export class Home {
  protected readonly catalog = COMPONENT_CATALOG;
}
