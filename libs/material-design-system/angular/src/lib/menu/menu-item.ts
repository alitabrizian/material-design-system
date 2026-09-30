import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PbContentTemplate } from '../core/content-template';

/** One item of a pb-menu (PBMenuItem). The content is the item's label. */
@Component({
  selector: 'pb-menu-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: '../core/content-template.html',
})
export class PbMenuItem extends PbContentTemplate {
  readonly icon = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly selected = output<void>();
}
