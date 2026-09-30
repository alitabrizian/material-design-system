import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChildren, input, model } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { PbMenuItem } from './menu-item';

export type PbMenuXPosition = 'before' | 'after';
export type PbMenuYPosition = 'above' | 'below';
export type PbMenuTriggerVariant = 'text' | 'filled' | 'tonal' | 'outlined' | 'elevated' | 'icon';

/**
 * Material 3 menu (PBMenu) opened from its own trigger button.
 *
 *   <pb-menu triggerVariant="icon" triggerIcon="more_vert" aria-label="More">
 *     <pb-menu-item icon="edit" (selected)="edit()">Edit</pb-menu-item>
 *   </pb-menu>
 */
@Component({
  selector: 'pb-menu',
  imports: [MatMenu, MatMenuItem, MatMenuTrigger, MatButton, MatIconButton, MatIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: inline-block' },
  templateUrl: './menu.html',
})
export class PbMenu {
  readonly triggerVariant = input<PbMenuTriggerVariant>('text');
  readonly triggerLabel = input('');
  readonly triggerIcon = input<string>();
  readonly xPosition = input<PbMenuXPosition>('after');
  readonly yPosition = input<PbMenuYPosition>('below');
  readonly panelClass = input('');
  readonly ariaLabel = input<string>(undefined, { alias: 'aria-label' });
  /** Whether the menu is open. It opens from the trigger; bind it to react to that. */
  readonly isOpen = model(false);

  protected readonly items = contentChildren(PbMenuItem);

  protected readonly triggerAppearance = computed(() => {
    const variant = this.triggerVariant();
    return variant === 'icon' ? 'text' : variant;
  });
}
