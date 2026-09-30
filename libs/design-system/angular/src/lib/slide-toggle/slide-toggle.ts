import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { providePbValueAccessor, PbValueAccessor } from '../core/value-accessor';

/** Material 3 switch (PBSlideToggle). The content is the label. */
@Component({
  selector: 'pb-slide-toggle',
  imports: [MatSlideToggle],
  providers: [providePbValueAccessor(() => PbSlideToggle)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slide-toggle.html',
})
export class PbSlideToggle extends PbValueAccessor<boolean> {
  readonly checked = model(false);
  readonly hideIcon = input(false, { transform: booleanAttribute });
  protected readonly valueModel = this.checked;

  override writeValue(value: boolean): void {
    super.writeValue(!!value);
  }
}
