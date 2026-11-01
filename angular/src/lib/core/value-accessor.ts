import {
  afterRenderEffect,
  booleanAttribute,
  computed,
  Directive,
  forwardRef,
  inject,
  input,
  Provider,
  signal,
  Type,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormField } from '@angular/material/form-field';
import { PbLayerOrder } from './layer-order';

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

  private readonly formField = viewChild(MatFormField);

  constructor() {
    super();
    // Keeps the field's menu (select, autocomplete, date and time pickers) in the Figma Layering order.
    inject(PbLayerOrder);
    // MatInput/MatSelect only re-check their error state when they have an NgControl, which the inner
    // control never has (the PB component is the form control): re-check it whenever errorText changes.
    afterRenderEffect(() => {
      this.errorText();
      const control = this.formField()?._control as unknown as { updateErrorState?: () => void } | undefined;
      control?.updateErrorState?.();
    });
  }
}
