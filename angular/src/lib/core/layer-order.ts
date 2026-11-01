import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/**
 * Keeps the overlays in the Figma Layering order, bottom to top: page content, app header, dragged,
 * menu, modal, dialog, popover, tooltip, snackbar, spotlight (styles/layer.css).
 *
 * The CDK shows every overlay (menus, selects, date pickers, dialogs, bottom sheets, tooltips, snackbars,
 * drag previews) as a popover in the browser's top layer, where z-index is ignored and the one shown last
 * is on top. So whenever one opens, every open overlay of a higher layer is shown again, which brings it
 * back above. An overlay's layer is the --pb-layer of the pb-layer--* class its pane or panel carries.
 * A lower layer opened from inside a higher one (a select in a dialog) still opens above it, because it
 * belongs to that surface. The Blazor library does the same in design-system.js.
 *
 * Root-provided and installed once by the first component that injects it.
 */
@Injectable({ providedIn: 'root' })
export class PbLayerOrder {
  private readonly document = inject(DOCUMENT);
  private ordering = false;

  constructor() {
    this.document.addEventListener(
      'toggle',
      (event) => {
        if ((event as ToggleEvent).newState === 'open' && event.target instanceof Element) this.order(event.target);
      },
      true,
    );
  }

  /** After `shown` entered the top layer: brings every open, non-empty popover of a higher layer back above it. */
  order(shown: Element): void {
    if (this.ordering || !shown.isConnected) return;
    const layer = layerOf(shown);
    if (layer === null) return;
    const above = [...this.document.querySelectorAll<HTMLElement>(':popover-open')]
      .filter((el) => el !== shown && !el.contains(shown) && !shown.contains(el) && el.childElementCount > 0)
      .map((el) => ({ el, layer: layerOf(el) }))
      .filter((entry): entry is { el: HTMLElement; layer: number } => entry.layer !== null && entry.layer > layer)
      .sort((a, b) => a.layer - b.layer);
    this.ordering = true;
    try {
      for (const { el } of above) bringToFront(el, this.document);
    } finally {
      this.ordering = false;
    }
  }
}

/** A top-layer element's layer: --pb-layer (not inherited) of itself or of an element just inside it. */
function layerOf(element: Element): number | null {
  for (const node of [element, ...element.querySelectorAll(':scope > *, :scope > * > *, :scope > * > * > *')]) {
    const layer = parseInt(getComputedStyle(node).getPropertyValue('--pb-layer'), 10);
    if (!Number.isNaN(layer)) return layer;
  }
  return null;
}

/**
 * Shows an open popover again, which moves it to the top of the top layer. It keeps its focus, and the
 * enter animations that restart when it is shown again are finished at once, so it doesn't move.
 */
function bringToFront(popover: HTMLElement, document: Document): void {
  const focused = popover.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
  try {
    popover.hidePopover();
    popover.showPopover();
  } catch {
    return;
  }
  for (const animation of popover.getAnimations({ subtree: true })) animation.finish();
  focused?.focus({ preventScroll: true });
}
