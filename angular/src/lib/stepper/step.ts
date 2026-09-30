import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PbContentTemplate } from '../core/content-template';

/** One step of a pb-stepper (PBStep). The content is the step's body. */
@Component({
  selector: 'pb-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: '../core/content-template.html',
})
export class PbStep extends PbContentTemplate {
  readonly label = input.required<string>();
  readonly optional = input(false, { transform: booleanAttribute });
  readonly editable = input(true, { transform: booleanAttribute });
}
