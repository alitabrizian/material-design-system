import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PbContentTemplate } from '../core/content-template';

/** One option of a pb-select or pb-autocomplete (PBOption). The content is the option's label. */
@Component({
  selector: 'pb-option',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: '../core/content-template.html',
})
export class PbOption<T = unknown> extends PbContentTemplate {
  readonly value = input.required<T>();
  readonly disabled = input(false, { transform: booleanAttribute });
}
