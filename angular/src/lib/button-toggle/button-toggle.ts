import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PbContentTemplate } from '../core/content-template';

/** One segment of a pb-button-toggle-group (PBButtonToggle). The content is the label. */
@Component({
  selector: 'pb-button-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: '../core/content-template.html',
})
export class PbButtonToggle extends PbContentTemplate {
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
}
