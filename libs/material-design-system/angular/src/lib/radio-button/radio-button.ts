import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PbContentTemplate } from '../core/content-template';

/** One option of a pb-radio-group (PBRadioButton). The content is the label. */
@Component({
  selector: 'pb-radio-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: '../core/content-template.html',
})
export class PbRadioButton<T = unknown> extends PbContentTemplate {
  readonly value = input.required<T>();
  readonly disabled = input(false, { transform: booleanAttribute });
}
