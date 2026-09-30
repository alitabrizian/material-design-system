import { booleanAttribute, ChangeDetectionStrategy, Component, contentChild, input, model } from '@angular/core';
import { MatError, MatFormField, MatHint, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { PbFieldBase, providePbValueAccessor } from '../core/value-accessor';
import { PbPrefix, PbSuffix } from './affixes';

/**
 * Material 3 text field (PBInput): mat-form-field + matInput.
 *
 *   <pb-input label="Email" type="email" [(value)]="email" supportingText="We never share it">
 *     <pb-icon pbPrefix>mail</pb-icon>
 *   </pb-input>
 */
@Component({
  selector: 'pb-input',
  imports: [MatFormField, MatLabel, MatInput, MatHint, MatError, MatPrefix, MatSuffix],
  providers: [providePbValueAccessor(() => PbInput)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './input.html',
  styleUrl: '../core/field.css',
})
export class PbInput extends PbFieldBase<string> {
  readonly value = model('');
  readonly type = input('text');
  readonly placeholder = input('');
  readonly readonly = input(false, { transform: booleanAttribute });
  protected readonly valueModel = this.value;

  protected readonly prefix = contentChild(PbPrefix);
  protected readonly suffix = contentChild(PbSuffix);

  override writeValue(value: string): void {
    super.writeValue(value ?? '');
  }

  protected onInput(event: Event): void {
    this.update((event.target as HTMLInputElement).value);
  }
}
