import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { PbFieldBase, providePbValueAccessor } from '../core/value-accessor';

/**
 * Material 3 date field with a calendar popup (PBDatepicker). Uses the native Date adapter; provide a
 * different DateAdapter higher up to change it.
 */
@Component({
  selector: 'pb-datepicker',
  imports: [
    MatFormField,
    MatLabel,
    MatInput,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatSuffix,
    MatHint,
    MatError,
  ],
  providers: [provideNativeDateAdapter(), providePbValueAccessor(() => PbDatepicker)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './datepicker.html',
  styleUrl: '../core/field.css',
})
export class PbDatepicker extends PbFieldBase<Date | null> {
  readonly value = model<Date | null>(null);
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  protected readonly valueModel = this.value;
}
