import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, contentChildren, input, model } from '@angular/core';
import { MatOption } from '@angular/material/core';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { PbFieldBase, providePbValueAccessor } from '../core/value-accessor';
import { PbOption } from './option';

/**
 * Material 3 select (PBSelect) of pb-option children.
 *
 *   <pb-select label="Fruit" [(value)]="fruit">
 *     <pb-option value="apple">Apple</pb-option>
 *   </pb-select>
 */
@Component({
  selector: 'pb-select',
  imports: [MatFormField, MatLabel, MatSelect, MatOption, MatHint, MatError, NgTemplateOutlet],
  providers: [providePbValueAccessor(() => PbSelect)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './select.html',
  styleUrl: '../core/field.css',
})
export class PbSelect<T = unknown> extends PbFieldBase<T | null> {
  readonly value = model<T | null>(null);
  readonly placeholder = input('');
  readonly hideSingleSelectionIndicator = input(false, { transform: booleanAttribute });
  protected readonly valueModel = this.value;

  protected readonly options = contentChildren(PbOption);
}
