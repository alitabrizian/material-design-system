import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { PbMenuItem } from './menu-item';
import { PbLayerOrder } from '../core/layer-order';
import { playExit } from '../core/motion';

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

  private readonly menu = viewChild.required(MatMenu);

  constructor() {
    // Keeps this overlay in the Figma Layering order in the top layer.
    inject(PbLayerOrder);
    afterNextRender(() => closeWithMotion(this.menu()));
  }
}

/**
 * Figma Motion: the menu closes with its open motion reversed (300ms) before it is removed. MatMenu gives
 * its exit animation 200ms at most, so closing waits for this motion first and then hands over to
 * MatMenu, whose own exit animation styles/material-motion.css reduces to 0s. Opening again while it
 * closes cancels the pending close.
 */
function closeWithMotion(menu: MatMenu): void {
  const setIsOpen = menu._setIsOpen.bind(menu);
  let request = 0;
  menu._setIsOpen = (isOpen: boolean) => {
    const current = ++request;
    const panel = document.getElementById(menu.panelId);
    if (isOpen) {
      panel?.classList.remove('pb-menu__panel--closing');
      setIsOpen(true);
      return;
    }
    void playExit(panel, 'pb-menu__panel--closing').then(() => {
      if (current === request) setIsOpen(false);
    });
  };
}
