import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PbContentTemplate } from '../core/content-template';

/** One tab of a pb-tabs (PBTab). The content is the tab's body. */
@Component({
  selector: 'pb-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: '../core/content-template.html',
})
export class PbTab extends PbContentTemplate {
  readonly label = input.required<string>();
  /** Optional icon name shown before the label. */
  readonly icon = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
}
