import {
  booleanAttribute,
  computed,
  Directive,
  forwardRef,
  input,
  Provider,
  signal,
  Type,
  WritableSignal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';

/** Registers a component as its own ControlValueAccessor (ngModel, formControl, formControlName). */
export function providePbValueAccessor(component: () => Type<unknown>): Provider {
  return { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(component), multi: true };
}

/**
 * Two-way binding for the PB form controls: a model() signal ([(value)] / [(checked)], like the Blazor
 * Value/ValueChanged pairs) that also works as a ControlValueAccessor for Angular forms.
 */
@Directive()
export abstract class PbValueAccessor<T> implements ControlValueAccessor {
  /** The signal the form value flows through (usually the component's model()). */
  protected abstract readonly valueModel: WritableSignal<T>;

  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  private onChange: (value: T) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: T): void {
    this.valueModel.set(value);
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  /** Called by the component when the user changes the value. */
  protected update(value: T): void {
    this.valueModel.set(value);
    this.onChange(value);
  }

  protected markTouched(): void {
    this.onTouched();
  }
}

export type PbFormFieldAppearance = 'fill' | 'outline';

/**
 * Inputs shared by every text-field-like control (Blazor's WorkspaceFieldComponentBase): label,
 * supporting and error text, appearance and full-width layout.
 */
@Directive({
  host: { '[class.pb-field--block]': 'block()' },
})
export abstract class PbFieldBase<T> extends PbValueAccessor<T> {
  readonly label = input<string>();
  readonly supportingText = input<string>();
  /** Shown in place of the supporting text, and puts the field in its error state, while set. */
  readonly errorText = input<string>();
  readonly appearance = input<PbFormFieldAppearance>('fill');
  readonly required = input(false, { transform: booleanAttribute });
  /** Stretches the field to the full width of its container. */
  readonly block = input(false, { transform: booleanAttribute });

  protected readonly errorStateMatcher: ErrorStateMatcher = {
    isErrorState: () => !!this.errorText(),
  };
}
