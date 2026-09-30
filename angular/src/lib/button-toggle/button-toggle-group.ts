import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  input,
  model,
  signal,
} from '@angular/core';
import { MatButtonToggle, MatButtonToggleChange, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { providePbValueAccessor, PbValueAccessor } from '../core/value-accessor';
import { PbButtonToggle } from './button-toggle';

/**
 * Material 3 connected button group (PBButtonToggleGroup): single selection through [(value)], or
 * multiple selection through [(values)] with multiple set.
 */
@Component({
  selector: 'pb-button-toggle-group',
  imports: [MatButtonToggleGroup, MatButtonToggle, NgTemplateOutlet],
  providers: [providePbValueAccessor(() => PbButtonToggleGroup)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button-toggle-group.html',
})
export class PbButtonToggleGroup extends PbValueAccessor<string | readonly string[] | null> {
  readonly multiple = input(false, { transform: booleanAttribute });
  readonly value = model<string | null>(null);
  readonly values = model<readonly string[]>([]);
  readonly hideSingleSelectionIndicator = input(false, { transform: booleanAttribute });
  readonly hideMultipleSelectionIndicator = input(false, { transform: booleanAttribute });

  /** The form value: value in single mode, values in multiple mode. */
  protected readonly valueModel = signal<string | readonly string[] | null>(null);

  protected readonly toggles = contentChildren(PbButtonToggle);

  override writeValue(value: string | readonly string[] | null): void {
    if (this.multiple()) {
      this.values.set(Array.isArray(value) ? value : []);
    } else {
      this.value.set(typeof value === 'string' ? value : null);
    }
  }

  protected select(change: MatButtonToggleChange): void {
    if (this.multiple()) {
      const values = (change.source.buttonToggleGroup.value as string[] | null) ?? [];
      this.values.set(values);
      this.update(values);
    } else {
      const value = change.value as string | null;
      this.value.set(value);
      this.update(value);
    }
    this.markTouched();
  }
}
