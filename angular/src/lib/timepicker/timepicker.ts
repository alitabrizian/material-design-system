import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTimepicker, MatTimepickerInput, MatTimepickerToggle } from '@angular/material/timepicker';
import { PbFieldBase, providePbValueAccessor } from '../core/value-accessor';

/** Material 3 time field with a list of times (PBTimepicker). Uses the native Date adapter. */
@Component({
  selector: 'pb-timepicker',
  imports: [
    MatFormField,
    MatLabel,
    MatInput,
    MatTimepicker,
    MatTimepickerInput,
    MatTimepickerToggle,
    MatSuffix,
    MatHint,
    MatError,
  ],
  providers: [provideNativeDateAdapter(), providePbValueAccessor(() => PbTimepicker)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timepicker.html',
  styleUrl: '../core/field.css',
})
export class PbTimepicker extends PbFieldBase<Date | null> {
  readonly value = model<Date | null>(null);
  /** Gap between the listed times, e.g. "30m" or "1h". */
  readonly interval = input('30m');
  protected readonly valueModel = this.value;
}
