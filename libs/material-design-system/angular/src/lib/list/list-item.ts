import { booleanAttribute, Directive, input, output } from '@angular/core';

/**
 * One row of a pb-list (PBListItem): up to three lines, a leading icon or avatar, trailing meta text.
 * With href the list renders it as a link; (clicked) fires on click either way.
 */
@Directive({ selector: 'pb-list-item' })
export class PbListItem {
  readonly title = input('');
  readonly subtitle = input<string>();
  readonly line3 = input<string>();
  readonly icon = input<string>();
  /** Image URL for a leading avatar. */
  readonly avatar = input<string>();
  readonly meta = input<string>();
  readonly href = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly selected = input(false, { transform: booleanAttribute });
  readonly clicked = output<void>();
}
