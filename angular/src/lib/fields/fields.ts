import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  Directive,
  input,
  model,
} from '@angular/core';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOption, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatError, MatFormField, MatHint, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatTimepicker, MatTimepickerInput, MatTimepickerToggle } from '@angular/material/timepicker';
import { PB_CONTENT_TEMPLATE, PbContentTemplate } from '../core/content-template';
import { PbFieldBase, providePbValueAccessor } from '../core/value-accessor';

/** Marks the element shown before the value in a pb-input (an icon or text). */
@Directive({ selector: '[pbPrefix]' })
export class PbPrefix {}

/** Marks the element shown after the value in a pb-input (an icon, text or icon button). */
@Directive({ selector: '[pbSuffix]' })
export class PbSuffix {}

const FIELD_STYLES = `
  :host { display: inline-block; }
  :host(.pb-field--block) { display: block; }
  :host(.pb-field--block) mat-form-field { width: 100%; }
`;

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
  styles: FIELD_STYLES,
  template: `
    <mat-form-field [appearance]="appearance()">
      @if (label(); as text) {
        <mat-label>{{ text }}</mat-label>
      }
      @if (prefix()) {
        <span matPrefix><ng-content select="[pbPrefix]" /></span>
      }
      <input
        matInput
        [type]="type()"
        [placeholder]="placeholder()"
        [required]="required()"
        [readonly]="readonly()"
        [disabled]="isDisabled()"
        [errorStateMatcher]="errorStateMatcher"
        [value]="value()"
        (input)="onInput($event)"
        (blur)="markTouched()"
      />
      @if (suffix()) {
        <span matSuffix><ng-content select="[pbSuffix]" /></span>
      }
      @if (errorText(); as text) {
        <mat-error>{{ text }}</mat-error>
      } @else if (supportingText(); as text) {
        <mat-hint>{{ text }}</mat-hint>
      }
    </mat-form-field>
  `,
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

/** One option of a pb-select or pb-autocomplete (PBOption). The content is the option's label. */
@Component({
  selector: 'pb-option',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PB_CONTENT_TEMPLATE,
})
export class PbOption<T = unknown> extends PbContentTemplate {
  readonly value = input.required<T>();
  readonly disabled = input(false, { transform: booleanAttribute });
}

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
  styles: FIELD_STYLES,
  template: `
    <mat-form-field [appearance]="appearance()">
      @if (label(); as text) {
        <mat-label>{{ text }}</mat-label>
      }
      <mat-select
        [value]="value()"
        [placeholder]="placeholder()"
        [required]="required()"
        [disabled]="isDisabled()"
        [hideSingleSelectionIndicator]="hideSingleSelectionIndicator()"
        [errorStateMatcher]="errorStateMatcher"
        (valueChange)="update($event)"
        (closed)="markTouched()"
      >
        @for (option of options(); track option) {
          <mat-option [value]="option.value()" [disabled]="option.disabled()">
            <ng-container [ngTemplateOutlet]="option.template()" />
          </mat-option>
        }
      </mat-select>
      @if (errorText(); as text) {
        <mat-error>{{ text }}</mat-error>
      } @else if (supportingText(); as text) {
        <mat-hint>{{ text }}</mat-hint>
      }
    </mat-form-field>
  `,
})
export class PbSelect<T = unknown> extends PbFieldBase<T | null> {
  readonly value = model<T | null>(null);
  readonly placeholder = input('');
  readonly hideSingleSelectionIndicator = input(false, { transform: booleanAttribute });
  protected readonly valueModel = this.value;

  protected readonly options = contentChildren(PbOption);
}

/**
 * Material 3 text field with suggestions (PBAutoComplete). Suggests the pb-option children whose
 * value contains the typed text; the value is the text.
 */
@Component({
  selector: 'pb-autocomplete',
  imports: [
    MatFormField,
    MatLabel,
    MatInput,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    MatHint,
    MatError,
    NgTemplateOutlet,
  ],
  providers: [providePbValueAccessor(() => PbAutocomplete)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: FIELD_STYLES,
  template: `
    <mat-form-field [appearance]="appearance()">
      @if (label(); as text) {
        <mat-label>{{ text }}</mat-label>
      }
      <input
        matInput
        [matAutocomplete]="panel"
        [placeholder]="placeholder()"
        [required]="required()"
        [disabled]="isDisabled()"
        [errorStateMatcher]="errorStateMatcher"
        [value]="value()"
        (input)="onInput($event)"
        (blur)="markTouched()"
      />
      <mat-autocomplete #panel="matAutocomplete" (optionSelected)="update($event.option.value)">
        @for (option of suggestions(); track option) {
          <mat-option [value]="option.value()" [disabled]="option.disabled()">
            <ng-container [ngTemplateOutlet]="option.template()" />
          </mat-option>
        }
      </mat-autocomplete>
      @if (errorText(); as text) {
        <mat-error>{{ text }}</mat-error>
      } @else if (supportingText(); as text) {
        <mat-hint>{{ text }}</mat-hint>
      }
    </mat-form-field>
  `,
})
export class PbAutocomplete extends PbFieldBase<string> {
  readonly value = model('');
  readonly placeholder = input('');
  protected readonly valueModel = this.value;

  protected readonly options = contentChildren<PbOption<string>>(PbOption);
  protected readonly suggestions = computed(() => {
    const text = this.value().toLowerCase();
    return this.options().filter((option) => option.value().toLowerCase().includes(text));
  });

  override writeValue(value: string): void {
    super.writeValue(value ?? '');
  }

  protected onInput(event: Event): void {
    this.update((event.target as HTMLInputElement).value);
  }
}

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
  styles: FIELD_STYLES,
  template: `
    <mat-form-field [appearance]="appearance()">
      @if (label(); as text) {
        <mat-label>{{ text }}</mat-label>
      }
      <input
        matInput
        [matDatepicker]="picker"
        [min]="min()"
        [max]="max()"
        [required]="required()"
        [disabled]="isDisabled()"
        [errorStateMatcher]="errorStateMatcher"
        [value]="value()"
        (dateChange)="update($event.value)"
        (blur)="markTouched()"
      />
      <mat-datepicker-toggle matSuffix [for]="picker" />
      <mat-datepicker #picker />
      @if (errorText(); as text) {
        <mat-error>{{ text }}</mat-error>
      } @else if (supportingText(); as text) {
        <mat-hint>{{ text }}</mat-hint>
      }
    </mat-form-field>
  `,
})
export class PbDatepicker extends PbFieldBase<Date | null> {
  readonly value = model<Date | null>(null);
  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  protected readonly valueModel = this.value;
}

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
  styles: FIELD_STYLES,
  template: `
    <mat-form-field [appearance]="appearance()">
      @if (label(); as text) {
        <mat-label>{{ text }}</mat-label>
      }
      <input
        matInput
        [matTimepicker]="picker"
        [required]="required()"
        [disabled]="isDisabled()"
        [errorStateMatcher]="errorStateMatcher"
        [value]="value()"
        (valueChange)="update($event)"
        (blur)="markTouched()"
      />
      <mat-timepicker-toggle matSuffix [for]="picker" />
      <mat-timepicker #picker [interval]="interval()" />
      @if (errorText(); as text) {
        <mat-error>{{ text }}</mat-error>
      } @else if (supportingText(); as text) {
        <mat-hint>{{ text }}</mat-hint>
      }
    </mat-form-field>
  `,
})
export class PbTimepicker extends PbFieldBase<Date | null> {
  readonly value = model<Date | null>(null);
  /** Gap between the listed times, e.g. "30m" or "1h". */
  readonly interval = input('30m');
  protected readonly valueModel = this.value;
}
