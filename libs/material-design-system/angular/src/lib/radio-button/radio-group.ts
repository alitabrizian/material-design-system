import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, contentChildren, input, model } from '@angular/core';
import { MatRadioButton, MatRadioChange, MatRadioGroup } from '@angular/material/radio';
import { providePbValueAccessor, PbValueAccessor } from '../core/value-accessor';
import { PbRadioButton } from './radio-button';

/** Material 3 radio group (PBRadioGroup) of pb-radio-button children. */
@Component({
  selector: 'pb-radio-group',
  imports: [MatRadioGroup, MatRadioButton, NgTemplateOutlet],
  providers: [providePbValueAccessor(() => PbRadioGroup)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.css',
})
export class PbRadioGroup<T = unknown> extends PbValueAccessor<T | null> {
  readonly value = model<T | null>(null);
  readonly vertical = input(false, { transform: booleanAttribute });
  protected readonly valueModel = this.value;

  protected readonly options = contentChildren(PbRadioButton);

  protected select(change: MatRadioChange): void {
    this.update(change.value as T);
    this.markTouched();
  }
}
