import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { providePbValueAccessor, PbValueAccessor } from '../core/value-accessor';

/** Material 3 checkbox (PBCheckbox). The content is the label. */
@Component({
  selector: 'pb-checkbox',
  imports: [MatCheckbox],
  providers: [providePbValueAccessor(() => PbCheckbox)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkbox.html',
})
export class PbCheckbox extends PbValueAccessor<boolean> {
  readonly checked = model(false);
  readonly indeterminate = model(false);
  protected readonly valueModel = this.checked;

  override writeValue(value: boolean): void {
    super.writeValue(!!value);
  }
}
