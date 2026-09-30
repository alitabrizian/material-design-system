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
import { MatCheckbox } from '@angular/material/checkbox';
import { MatRadioButton, MatRadioChange, MatRadioGroup } from '@angular/material/radio';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { PB_CONTENT_TEMPLATE, PbContentTemplate } from '../core/content-template';
import { providePbValueAccessor, PbValueAccessor } from '../core/value-accessor';

/** Material 3 checkbox (PBCheckbox). The content is the label. */
@Component({
  selector: 'pb-checkbox',
  imports: [MatCheckbox],
  providers: [providePbValueAccessor(() => PbCheckbox)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-checkbox
      [checked]="checked()"
      [(indeterminate)]="indeterminate"
      [disabled]="isDisabled()"
      (change)="update($event.checked)"
      (blur)="markTouched()"
    ><ng-content /></mat-checkbox>
  `,
})
export class PbCheckbox extends PbValueAccessor<boolean> {
  readonly checked = model(false);
  readonly indeterminate = model(false);
  protected readonly valueModel = this.checked;

  override writeValue(value: boolean): void {
    super.writeValue(!!value);
  }
}

/** Material 3 switch (PBSlideToggle). The content is the label. */
@Component({
  selector: 'pb-slide-toggle',
  imports: [MatSlideToggle],
  providers: [providePbValueAccessor(() => PbSlideToggle)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-slide-toggle
      [checked]="checked()"
      [hideIcon]="hideIcon()"
      [disabled]="isDisabled()"
      (change)="update($event.checked)"
      (blur)="markTouched()"
    ><ng-content /></mat-slide-toggle>
  `,
})
export class PbSlideToggle extends PbValueAccessor<boolean> {
  readonly checked = model(false);
  readonly hideIcon = input(false, { transform: booleanAttribute });
  protected readonly valueModel = this.checked;

  override writeValue(value: boolean): void {
    super.writeValue(!!value);
  }
}

/** One option of a pb-radio-group (PBRadioButton). The content is the label. */
@Component({
  selector: 'pb-radio-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PB_CONTENT_TEMPLATE,
})
export class PbRadioButton<T = unknown> extends PbContentTemplate {
  readonly value = input.required<T>();
  readonly disabled = input(false, { transform: booleanAttribute });
}

/** Material 3 radio group (PBRadioGroup) of pb-radio-button children. */
@Component({
  selector: 'pb-radio-group',
  imports: [MatRadioGroup, MatRadioButton, NgTemplateOutlet],
  providers: [providePbValueAccessor(() => PbRadioGroup)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; }
    .pb-radio-group--vertical { display: flex; flex-direction: column; align-items: flex-start; }
  `,
  template: `
    <mat-radio-group
      [class.pb-radio-group--vertical]="vertical()"
      [value]="value()"
      [disabled]="isDisabled()"
      (change)="select($event)"
    >
      @for (option of options(); track option) {
        <mat-radio-button [value]="option.value()" [disabled]="option.disabled()">
          <ng-container [ngTemplateOutlet]="option.template()" />
        </mat-radio-button>
      }
    </mat-radio-group>
  `,
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

/** One segment of a pb-button-toggle-group (PBButtonToggle). The content is the label. */
@Component({
  selector: 'pb-button-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PB_CONTENT_TEMPLATE,
})
export class PbButtonToggle extends PbContentTemplate {
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
}

/**
 * Material 3 connected button group (PBButtonToggleGroup): single selection through [(value)], or
 * multiple selection through [(values)] with multiple set.
 */
@Component({
  selector: 'pb-button-toggle-group',
  imports: [MatButtonToggleGroup, MatButtonToggle, NgTemplateOutlet],
  providers: [providePbValueAccessor(() => PbButtonToggleGroup)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-button-toggle-group
      [multiple]="multiple()"
      [value]="multiple() ? values() : value()"
      [disabled]="isDisabled()"
      [hideSingleSelectionIndicator]="hideSingleSelectionIndicator()"
      [hideMultipleSelectionIndicator]="hideMultipleSelectionIndicator()"
      (change)="select($event)"
    >
      @for (toggle of toggles(); track toggle) {
        <mat-button-toggle [value]="toggle.value()" [disabled]="toggle.disabled()">
          <ng-container [ngTemplateOutlet]="toggle.template()" />
        </mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
})
export class PbButtonToggleGroup extends PbValueAccessor<string | readonly string[] | null> {
  readonly multiple = input(false, { transform: booleanAttribute });
  readonly value = model<string | null>(null);
  readonly values = model<readonly string[]>([]);
  readonly hideSingleSelectionIndicator = input(false, { transform: booleanAttribute });
  readonly hideMultipleSelectionIndicator = input(false, { transform: booleanAttribute });

  /** The form value is value in single mode and values in multiple mode. */
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

/** Material 3 slider (PBSlider) with one thumb. */
@Component({
  selector: 'pb-slider',
  imports: [MatSlider, MatSliderThumb],
  providers: [providePbValueAccessor(() => PbSlider)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; } mat-slider { width: 100%; }',
  template: `
    <mat-slider
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [discrete]="discrete()"
      [showTickMarks]="showTickMarks()"
      [disabled]="isDisabled()"
    >
      <input matSliderThumb [value]="value()" (valueChange)="update($event)" (blur)="markTouched()" />
    </mat-slider>
  `,
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
