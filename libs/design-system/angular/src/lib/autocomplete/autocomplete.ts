import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, contentChildren, input, model } from '@angular/core';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOption } from '@angular/material/core';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { PbFieldBase, providePbValueAccessor } from '../core/value-accessor';
import { PbOption } from '../select/option';

/** Decides whether an option (its value) is suggested for the typed text. */
export type PbAutocompleteFilter = (optionValue: string, text: string) => boolean;

/** The default filter: the option contains the text, ignoring case. */
export const pbContainsFilter: PbAutocompleteFilter = (optionValue, text) =>
  optionValue.toLowerCase().includes(text.toLowerCase());

/**
 * Material 3 text field with suggestions (PBAutoComplete). Suggests the pb-option children the filter
 * accepts for the typed text; the value is the text.
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
  templateUrl: './autocomplete.html',
  styleUrl: '../core/field.css',
})
export class PbAutocomplete extends PbFieldBase<string> {
  readonly value = model('');
  readonly placeholder = input('');
  readonly filter = input<PbAutocompleteFilter>(pbContainsFilter);
  /** Highlights the first suggestion, so Enter picks it. */
  readonly autoActiveFirstOption = input(false, { transform: booleanAttribute });
  /** Clears text that doesn't match an option when the panel closes. */
  readonly requireSelection = input(false, { transform: booleanAttribute });
  protected readonly valueModel = this.value;

  protected readonly options = contentChildren<PbOption<string>>(PbOption);
  protected readonly suggestions = computed(() => {
    const text = this.value();
    const filter = this.filter();
    return this.options().filter((option) => filter(option.value(), text));
  });

  override writeValue(value: string): void {
    super.writeValue(value ?? '');
  }

  protected onInput(event: Event): void {
    this.update((event.target as HTMLInputElement).value);
  }
}
