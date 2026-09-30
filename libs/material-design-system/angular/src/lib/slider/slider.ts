import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { providePbValueAccessor, PbValueAccessor } from '../core/value-accessor';

/** Material 3 slider (PBSlider) with one thumb. */
@Component({
  selector: 'pb-slider',
  imports: [MatSlider, MatSliderThumb],
  providers: [providePbValueAccessor(() => PbSlider)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slider.html',
  styleUrl: './slider.css',
})
export class PbSlider extends PbValueAccessor<number> {
  readonly value = model(0);
  readonly min = input(0);
  readonly max = input(100);
  readonly step = input(1);
  /** Shows the value in a label above the thumb while dragging. */
  readonly discrete = input(false, { transform: booleanAttribute });
  readonly showTickMarks = input(false, { transform: booleanAttribute });
  protected readonly valueModel = this.value;

  override writeValue(value: number): void {
    super.writeValue(Number(value) || 0);
  }
}
