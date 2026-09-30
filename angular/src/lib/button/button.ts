import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatButton, MatFabButton, MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

export type PbButtonVariant =
  | 'text'
  | 'filled'
  | 'tonal'
  | 'outlined'
  | 'elevated'
  | 'icon'
  | 'fab'
  | 'mini-fab'
  | 'extended-fab';

type ButtonKind = 'button' | 'icon' | 'fab' | 'mini-fab';

/**
 * Material 3 button (PBButton). Renders <button> or, with href, <a>; the variant picks
 * matButton / matIconButton / matFab / matMiniFab.
 *
 *   <pb-button variant="filled" iconStart="add" (click)="save()">Save</pb-button>
 *   <pb-button variant="icon" icon="favorite" aria-label="Favorite" />
 */
@Component({
  selector: 'pb-button',
  imports: [NgTemplateOutlet, MatButton, MatIconButton, MatFabButton, MatMiniFabButton, MatIcon, MatProgressSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pb-button' },
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class PbButton {
  readonly variant = input<PbButtonVariant>('text');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  /** Renders an <a> instead of a <button>. */
  readonly href = input<string>();
  /** Icon name for the icon, fab and mini-fab variants (and the extended fab's leading icon). */
  readonly icon = input<string>();
  readonly iconStart = input<string>();
  readonly iconEnd = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Keeps a disabled button focusable and hoverable (for tooltips explaining why). */
  readonly disabledInteractive = input(false, { transform: booleanAttribute });
  /** Replaces the content with a progress spinner. */
  readonly showProgress = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string>(undefined, { alias: 'aria-label' });

  protected readonly kind = computed<ButtonKind>(() => {
    switch (this.variant()) {
      case 'icon':
        return 'icon';
      case 'fab':
      case 'extended-fab':
        return 'fab';
      case 'mini-fab':
        return 'mini-fab';
      default:
        return 'button';
    }
  });

  protected readonly extended = computed(() => this.variant() === 'extended-fab');

  protected readonly appearance = computed(() => {
    const variant = this.variant();
    return variant === 'filled' || variant === 'tonal' || variant === 'outlined' || variant === 'elevated'
      ? variant
      : 'text';
  });
}
