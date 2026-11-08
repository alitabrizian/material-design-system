// PartoBita design system runtime helpers (loaded once as an ES module).
//
//  - Ripple: MatRipple-style ink under the pointer for any element with `pb-ripple-host`. Uses
//    event delegation on `document`, so it works for all current and future Blazor-rendered content.
//  - Overlay positioning: CDK FlexibleConnectedPositionStrategy-like placement of menu/select/
//    autocomplete panels with position:fixed (never clipped by an ancestor's overflow).
//  - Dialog + focus helpers used by PBDialog, PBMenu, PBSelect.
//  - Layer order: keeps popovers and modal dialogs (the browser's top layer) in the Figma Layering order.
//
// The Blazor components import this module through IJSRuntime ("./_content/PartoBita.DesignSystem.Blazor/design-system.js").

const RIPPLE_ENTER_MS = 450;
const RIPPLE_EXIT_MS = 400;

function rippleContainer(host) {
  return host.querySelector(":scope > .pb-state-layer, :scope > .pb-ripple-container") || host;
}

function isDisabled(host) {
  return host.matches(":disabled, [aria-disabled='true'], .pb-ripple-disabled");
}

function launchRipple(host, event) {
  if (isDisabled(host) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const container = rippleContainer(host);
  const rect = container.getBoundingClientRect();
  const centered = host.classList.contains("pb-ripple-centered") || event.detail === 0;
  const x = centered ? rect.left + rect.width / 2 : event.clientX;
  const y = centered ? rect.top + rect.height / 2 : event.clientY;

  // Radius = distance to the farthest corner, like MatRipple's distanceToFurthestCorner().
  const dx = Math.max(Math.abs(x - rect.left), Math.abs(x - rect.right));
  const dy = Math.max(Math.abs(y - rect.top), Math.abs(y - rect.bottom));
  const radius = Math.sqrt(dx * dx + dy * dy);

  const ripple = document.createElement("span");
  ripple.className = "pb-ripple";
  ripple.style.left = `${x - rect.left - radius}px`;
  ripple.style.top = `${y - rect.top - radius}px`;
  ripple.style.width = ripple.style.height = `${radius * 2}px`;

  if (container === host && getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }
  if (container === host) {
    host.style.overflow = "hidden";
  }

  container.appendChild(ripple);
  // Force a style flush so the transition runs from scale(0).
  ripple.getBoundingClientRect();
  ripple.classList.add("pb-ripple--visible");

  const startedAt = performance.now();
  const fade = () => {
    window.removeEventListener("pointerup", fade);
    window.removeEventListener("pointercancel", fade);
    host.removeEventListener("pointerleave", fade);
    const wait = Math.max(0, RIPPLE_ENTER_MS * 0.5 - (performance.now() - startedAt));
    setTimeout(() => {
      ripple.classList.add("pb-ripple--fading");
      setTimeout(() => ripple.remove(), RIPPLE_EXIT_MS);
    }, wait);
  };

  if (event.type === "pointerdown") {
    window.addEventListener("pointerup", fade);
    window.addEventListener("pointercancel", fade);
    host.addEventListener("pointerleave", fade);
  } else {
    fade();
  }
}

document.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const host = event.target.closest?.(".pb-ripple-host");
  if (host) launchRipple(host, event);
});

// Keyboard activation (Enter/Space) on a focused ripple host gets a centered ripple, like MatRipple.
document.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
    const host = event.target.closest?.(".pb-ripple-host");
    if (host && host === event.target) launchRipple(host, { type: "keydown", detail: 0 });
  }
});

// ---------------------------------------------------------------------------------- overlays

const positioned = new Map();

function resolveAnchor(panel, anchor, options) {
  if (options.anchorSelector) {
    return panel.closest(options.anchorClosest ?? "*")?.querySelector(options.anchorSelector) ?? anchor;
  }
  return anchor;
}

/**
 * Shows `panel` in the top layer (Popover API, so no ancestor's overflow or z-index can clip it)
 * and positions it next to `anchor`, like the CDK's FlexibleConnectedPositionStrategy.
 * options: {
 *   x: "start" | "end", y: "below" | "above", overlap: bool, matchWidth: bool, minWidth: bool, offset: px,
 *   anchorClosest / anchorSelector: find the anchor relative to the panel instead,
 *   dotNet + closeMethod: invoked when the user presses the pointer outside panel and anchor
 * }
 * Flips vertically when there is not enough room and clamps into the viewport (8px margin).
 */
// The visible viewport, without classic scrollbars (window.innerWidth/Height include them).
const viewport = () => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
});

// An overlay's untransformed size, measured from the viewport origin. Enter animations scale the
// panel (0.8 -> 1), which getBoundingClientRect would report; and a fixed element left near the
// right edge from its last placement shrinks to the space that remains, wrapping its content.
function overlaySize(panel) {
  panel.style.left = "0px";
  panel.style.top = "0px";
  return { width: panel.offsetWidth, height: panel.offsetHeight };
}

export function position(panel, anchor, options = {}) {
  if (!panel) return;
  anchor = resolveAnchor(panel, anchor, options);
  if (!anchor) return;
  unposition(panel);

  if (panel.hasAttribute("popover") && !panel.matches(":popover-open")) {
    try { panel.showPopover(); } catch { /* already shown or not connected */ }
  }

  const place = () => {
    if (!panel.isConnected || !anchor.isConnected) {
      unposition(panel);
      return;
    }
    const a = anchor.getBoundingClientRect();
    if (options.matchWidth) panel.style.width = `${a.width}px`;
    if (options.minWidth) panel.style.minWidth = `${a.width}px`;
    const p = overlaySize(panel);
    const vp = viewport();
    const margin = 8;
    const offset = options.offset ?? 0;
    const rtl = getComputedStyle(anchor).direction === "rtl";
    const alignEnd = (options.x === "end") !== rtl;

    let left = alignEnd ? a.right - p.width : a.left;
    left = Math.min(Math.max(margin, left), vp.width - p.width - margin);

    const belowTop = options.overlap ? a.top : a.bottom + offset;
    const aboveTop = (options.overlap ? a.bottom : a.top - offset) - p.height;
    const fitsBelow = belowTop + p.height <= vp.height - margin;
    const fitsAbove = aboveTop >= margin;
    const above = options.y === "above" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;
    let top = above ? aboveTop : belowTop;
    top = Math.min(Math.max(margin, top), Math.max(margin, vp.height - p.height - margin));

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.transformOrigin = `${alignEnd ? "right" : "left"} ${above ? "bottom" : "top"}`;
    panel.classList.toggle("pb-overlay--above", above);
    panel.classList.remove("pb-overlay--pending");
  };

  place();
  const listener = () => place();
  const outside = (event) => {
    if (!options.dotNet) return;
    const path = event.composedPath();
    if (!path.includes(panel) && !path.includes(anchor)) {
      options.dotNet.invokeMethodAsync(options.closeMethod ?? "CloseFromOutside");
    }
  };
  window.addEventListener("resize", listener);
  window.addEventListener("scroll", listener, true);
  document.addEventListener("pointerdown", outside, true);
  positioned.set(panel, { listener, outside });
}

/** Places a panel shown by position() again, e.g. after its content or its anchor changed size. */
export function reposition(panel) {
  positioned.get(panel)?.listener();
}

export function unposition(panel) {
  const entry = positioned.get(panel);
  if (entry) {
    window.removeEventListener("resize", entry.listener);
    window.removeEventListener("scroll", entry.listener, true);
    document.removeEventListener("pointerdown", entry.outside, true);
    positioned.delete(panel);
  }
  if (panel?.hasAttribute?.("popover") && panel.matches(":popover-open")) {
    try { panel.hidePopover(); } catch { /* ignore */ }
  }
}

/**
 * Figma Motion close: adds className (if given) to element and resolves once the CSS animations it starts
 * have finished, so the caller removes the element after its closing motion. Resolves at once when there is
 * nothing to wait for (no element, or prefers-reduced-motion made the duration 0ms); a cancelled
 * animation (e.g. the element opened again) also resolves it.
 */
export async function playExit(element, className) {
  if (!element?.isConnected) return;
  if (className) element.classList.add(className);
  const animations = element.getAnimations();
  await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
}
// ---------------------------------------------------------------------------------- focus

export function focus(element, options) {
  element?.focus?.(options ?? { preventScroll: false });
}

export function focusFirst(container, selector) {
  const target = container?.querySelector(selector ?? "[role^='menuitem']:not([aria-disabled='true']), [role='option']:not([aria-disabled='true'])");
  target?.focus();
}

/** Moves focus among `selector` items inside `container` (roving focus for menus/lists/trees). */
export function moveFocus(container, selector, key) {
  const items = [...container.querySelectorAll(selector)].filter((el) => el.offsetParent !== null && el.getAttribute("aria-disabled") !== "true" && !el.disabled);
  if (items.length === 0) return;
  const current = items.indexOf(document.activeElement);
  let next;
  switch (key) {
    case "Home": next = 0; break;
    case "End": next = items.length - 1; break;
    case "ArrowUp": case "ArrowLeft": next = current <= 0 ? items.length - 1 : current - 1; break;
    default: next = current < 0 || current >= items.length - 1 ? 0 : current + 1; break;
  }
  items[next].focus();
}

export function scrollIntoView(container, selector) {
  container?.querySelector(selector)?.scrollIntoView({ block: "nearest" });
}

// ---------------------------------------------------------------------------------- dialog

const dialogCancelHandlers = new WeakMap();

/** Opens a native <dialog> modally. `dotNet.invokeMethodAsync("OnCancel")` fires on Escape/backdrop. */
export function showDialog(dialog, dotNet, closeOnBackdrop) {
  if (!dialog || dialog.open) return;
  const onCancel = (event) => {
    // Escape: let the component decide (DisableClose), and keep the <dialog> open meanwhile.
    event.preventDefault();
    dotNet?.invokeMethodAsync("OnCancel");
  };
  const onClick = (event) => {
    if (closeOnBackdrop && event.target === dialog) dotNet?.invokeMethodAsync("OnCancel");
  };
  dialog.addEventListener("cancel", onCancel);
  dialog.addEventListener("click", onClick);
  dialogCancelHandlers.set(dialog, { onCancel, onClick });
  dialog.showModal();
  orderLayers(dialog);
}

export function closeDialog(dialog) {
  if (!dialog) return;
  const handlers = dialogCancelHandlers.get(dialog);
  if (handlers) {
    dialog.removeEventListener("cancel", handlers.onCancel);
    dialog.removeEventListener("click", handlers.onClick);
    dialogCancelHandlers.delete(dialog);
  }
  if (dialog.open) dialog.close();
}

// ---------------------------------------------------------------------------------- layers

// Figma Layering, bottom to top: page content, app header, dragged, menu, modal, dialog, popover,
// tooltip, snackbar, spotlight (styles/layer.css). Popovers and modal dialogs live in the browser's top
// layer, where z-index is ignored and the one shown last is on top. So whenever one opens, every open
// popover of a higher layer is shown again, which brings it back above. A lower layer opened from inside
// a higher one (a select in a dialog) still opens above it, because it belongs to that surface.
// Angular's PbLayerOrder does the same for the CDK overlays.

/** A top-layer element's layer: --pb-layer (not inherited) of itself or of an element just inside it. */
function layerOf(element) {
  for (const node of [element, ...element.querySelectorAll(":scope > *, :scope > * > *, :scope > * > * > *")]) {
    const layer = parseInt(getComputedStyle(node).getPropertyValue("--pb-layer"), 10);
    if (!Number.isNaN(layer)) return layer;
  }
  return null;
}

/**
 * Shows an open popover again, which moves it to the top of the top layer. It keeps its focus and, unless
 * `animate`, the enter animations that restart when it is shown again are finished at once, so it doesn't move.
 */
function bringToFront(popover, animate = false) {
  const focused = popover.contains(document.activeElement) ? document.activeElement : null;
  try {
    popover.hidePopover();
    popover.showPopover();
  } catch {
    return;
  }
  if (!animate) for (const animation of popover.getAnimations({ subtree: true })) animation.finish();
  focused?.focus({ preventScroll: true });
}

let ordering = false;

/** After `shown` entered the top layer: brings every open, non-empty popover of a higher layer back above it. */
export function orderLayers(shown) {
  if (ordering || !shown?.isConnected) return;
  const layer = layerOf(shown);
  if (layer === null) return;
  const above = [...document.querySelectorAll(":popover-open")]
    .filter((el) => el !== shown && !el.contains(shown) && !shown.contains(el) && el.childElementCount > 0)
    .map((el) => ({ el, layer: layerOf(el) }))
    .filter((entry) => entry.layer !== null && entry.layer > layer)
    .sort((a, b) => a.layer - b.layer);
  ordering = true;
  try {
    for (const { el } of above) bringToFront(el);
  } finally {
    ordering = false;
  }
}

/**
 * Shows a popover, or brings an open one to the top of the top layer with its new content animating in,
 * then keeps any higher layer above it (PBSnackbar, when a message appears).
 */
export function raiseLayer(popover) {
  if (!popover?.isConnected) return;
  if (popover.hasAttribute("popover") && !popover.matches(":popover-open")) {
    try { popover.showPopover(); } catch { return; }
  } else {
    bringToFront(popover, true);
  }
  orderLayers(popover);
}

// Every popover a component or the app opens (menus, selects, date pickers, tooltips) fires toggle.
document.addEventListener("toggle", (event) => {
  if (event.newState === "open" && event.target instanceof Element) orderLayers(event.target);
}, true);

// ---------------------------------------------------------------------------------- misc

/** Opens the browser's native picker for a date/time input (PBDatepicker/PBTimepicker toggle). */
export function showPicker(input) {
  try {
    input?.showPicker?.();
  } catch {
    input?.focus();
  }
}

export function getInputValue(input) {
  return input?.value ?? "";
}

/** Sets a checkbox's indeterminate property (there is no HTML attribute for it). */
export function setIndeterminate(input, value) {
  if (input) input.indeterminate = !!value;
}

// PBSlider: keep the active-track fill in sync while dragging, even when the consumer does not
// re-render on every input event (the component also sets it from its parameters on render).
function updateSliderFill(input) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value);
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  input.closest(".pb-slider")?.style.setProperty("--pb-slider-fill", `${Math.min(100, Math.max(0, percent))}%`);
}

document.addEventListener("input", (event) => {
  if (event.target.matches?.(".pb-slider__input")) updateSliderFill(event.target);
});

/** PBFormField: projected inputs need a placeholder for the :placeholder-shown float rule. */
export function ensurePlaceholders(container) {
  container?.querySelectorAll(".pb-form-field__infix > input, .pb-form-field__infix > textarea").forEach((el) => {
    if (!el.hasAttribute("placeholder")) el.setAttribute("placeholder", " ");
  });
}

const preventedKeys = new WeakMap();

/** Prevents the browser default (scrolling, form submit) for `keys` pressed on `element`. */
export function preventKeys(element, keys) {
  if (!element || preventedKeys.has(element)) return;
  const handler = (event) => {
    if (keys.includes(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) event.preventDefault();
  };
  element.addEventListener("keydown", handler);
  preventedKeys.set(element, handler);
}

/**
 * PBTabs: slides the active indicator from the previously active tab, like MDC's tab indicator
 * (transform from the old tab's box to the new one over 250ms).
 */
export function animateTabIndicator(tablist, previousIndex, nextIndex) {
  const tabs = tablist?.querySelectorAll(":scope > [role='tab']");
  if (!tabs || previousIndex < 0 || !tabs[previousIndex] || !tabs[nextIndex]) return;
  const from = tabs[previousIndex].getBoundingClientRect();
  const to = tabs[nextIndex].getBoundingClientRect();
  const indicator = tabs[nextIndex].querySelector(".pb-tab__indicator-content");
  if (!indicator || !to.width) return;
  indicator.style.transition = "none";
  indicator.style.transform = `translateX(${from.left - to.left}px) scaleX(${from.width / to.width})`;
  indicator.getBoundingClientRect();
  indicator.style.transition = "";
  indicator.style.transform = "";
}

// Tabs handle Enter/Space natively (they are buttons); arrow keys must not scroll the page.
document.addEventListener("keydown", (event) => {
  if (event.target.matches?.(".pb-tab") && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    event.preventDefault();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches?.(".pb-step-header") && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
    event.preventDefault();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target.closest?.(".pb-menu__content") && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
  }
  if (event.target.closest?.(".pb-menu__trigger-host") && ["ArrowDown", "ArrowUp"].includes(event.key)) {
    event.preventDefault();
  }
});

/** PBTree: focus the parent treeitem of `item` (ArrowLeft on a collapsed node). */
export function focusParentTreeItem(item) {
  item?.parentElement?.closest("[role='treeitem']")?.focus();
}

/** PBTree: focus the first child treeitem of `item` (ArrowRight on an expanded node). */
export function focusFirstChildTreeItem(item) {
  item?.querySelector(":scope > [role='group'] > [role='treeitem']")?.focus();
}

document.addEventListener("keydown", (event) => {
  if (event.target.matches?.(".pb-tree-node") && ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", " "].includes(event.key)) {
    event.preventDefault();
  }
});

/** PBTree: Up/Down/Home/End over the visible treeitems of the tree containing `item`. */
export function moveFocusInTree(item, key) {
  const tree = item?.closest("[role='tree']");
  if (tree) moveFocus(tree, "[role='treeitem']", key);
}

// ---------------------------------------------------------------------------------- tooltip
// PBTooltip: shown on pointer hover and keyboard focus of its host, in the top layer, 8px from
// the trigger (matTooltip), described to assistive tech via aria-describedby on the focusable child.

const TOOLTIP_GAP = 8;

function tooltipOf(host) {
  return host.querySelector(":scope > .pb-tooltip");
}

function placeTooltip(host, tip) {
  const a = host.getBoundingClientRect();
  const p = overlaySize(tip);
  const vp = viewport();
  const rtl = getComputedStyle(host).direction === "rtl";
  let position = host.dataset.pbTooltipPosition || "below";
  if (position === "before") position = rtl ? "right" : "left";
  if (position === "after") position = rtl ? "left" : "right";

  const fits = {
    below: a.bottom + TOOLTIP_GAP + p.height <= vp.height,
    above: a.top - TOOLTIP_GAP - p.height >= 0,
    left: a.left - TOOLTIP_GAP - p.width >= 0,
    right: a.right + TOOLTIP_GAP + p.width <= vp.width,
  };
  const flip = { below: "above", above: "below", left: "right", right: "left" };
  if (!fits[position] && fits[flip[position]]) position = flip[position];

  let top;
  let left;
  if (position === "below" || position === "above") {
    top = position === "below" ? a.bottom + TOOLTIP_GAP : a.top - TOOLTIP_GAP - p.height;
    left = a.left + a.width / 2 - p.width / 2;
  } else {
    top = a.top + a.height / 2 - p.height / 2;
    left = position === "right" ? a.right + TOOLTIP_GAP : a.left - TOOLTIP_GAP - p.width;
  }
  left = Math.min(Math.max(TOOLTIP_GAP, left), vp.width - p.width - TOOLTIP_GAP);
  top = Math.min(Math.max(TOOLTIP_GAP, top), vp.height - p.height - TOOLTIP_GAP);
  tip.style.left = `${Math.round(left)}px`;
  tip.style.top = `${Math.round(top)}px`;
}

function showTooltip(host) {
  const tip = tooltipOf(host);
  if (!tip || !tip.textContent.trim()) return;
  const trigger = host.querySelector("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
  if (trigger && trigger !== tip && !trigger.hasAttribute("aria-describedby")) {
    trigger.setAttribute("aria-describedby", tip.id);
  }
  if (!tip.matches(":popover-open")) {
    try { tip.showPopover(); } catch { return; }
  }
  placeTooltip(host, tip);
}

// Instant, as the Figma Motion page specifies (no hide animation to wait for).
function hideTooltip(host) {
  const tip = tooltipOf(host);
  if (!tip || !tip.matches(":popover-open")) return;
  try { tip.hidePopover(); } catch { /* removed */ }
}

// Content of an open overlay (e.g. a menu opened by the tooltip's trigger) never triggers the tooltip.
const inOverlay = (el) => !!el?.closest?.(".pb-overlay:not(.pb-tooltip)");

document.addEventListener("pointerover", (event) => {
  const host = event.target.closest?.(".pb-tooltip-host");
  if (!host) return;
  if (inOverlay(event.target)) hideTooltip(host);
  else if (!host.contains(event.relatedTarget) || inOverlay(event.relatedTarget)) showTooltip(host);
});

document.addEventListener("pointerout", (event) => {
  const host = event.target.closest?.(".pb-tooltip-host");
  if (host && !host.contains(event.relatedTarget)) hideTooltip(host);
});

document.addEventListener("focusin", (event) => {
  const host = event.target.closest?.(".pb-tooltip-host");
  if (host && !inOverlay(event.target) && event.target.matches(":focus-visible")) showTooltip(host);
});

document.addEventListener("focusout", (event) => {
  const host = event.target.closest?.(".pb-tooltip-host");
  if (host) hideTooltip(host);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelectorAll(".pb-tooltip-host").forEach((host) => hideTooltip(host));
  }
});

/** PBDialog Inline: show the surface in place, non-modal, for documentation. */
export function showInlineDialog(dialog) {
  if (dialog && !dialog.open) dialog.show();
}

// ---------------------------------------------------------------------------------- data grid
// PBDataGrid: column resizing, header drag (reorder / group / ungroup), row drag and drop (within
// and between grids of one DragDropGroup), sticky fixed-column offsets, adaptivity width reports,
// and the browser defaults the grid's keyboard navigation must suppress. One delegated listener set
// per grid root; nested grids (master-detail) are told apart with closest(".pb-data-grid").

const gridStates = new WeakMap();
let gridDrag = null;

const gridOf = (el) => el?.closest?.(".pb-data-grid");
const gridTable = (root) => root.querySelector(".pb-data-grid__scroll > .pb-data-grid__table");
const measureCells = (table) => [...(table?.tHead?.rows[0]?.cells ?? [])];

function syncFixedColumns(root) {
  const table = gridTable(root);
  const cells = measureCells(table);
  let start = 0;
  cells.forEach((cell, i) => {
    if (cell.dataset.fixed === "left") {
      table.style.setProperty(`--pbg-fl-${i}`, `${start}px`);
      start += cell.getBoundingClientRect().width;
    }
  });
  let end = 0;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].dataset.fixed === "right") {
      table.style.setProperty(`--pbg-fr-${i}`, `${end}px`);
      end += cells[i].getBoundingClientRect().width;
    }
  }
}

function clearDropMarks(root) {
  root.querySelectorAll(".pb-data-grid__drop-before, .pb-data-grid__drop-after, .pb-data-grid__row--drop-before, .pb-data-grid__row--drop-after, .pb-data-grid__row--drop-inside")
    .forEach((el) => el.classList.remove("pb-data-grid__drop-before", "pb-data-grid__drop-after", "pb-data-grid__row--drop-before", "pb-data-grid__row--drop-after", "pb-data-grid__row--drop-inside"));
  root.querySelectorAll(".pb-data-grid__group-panel--drop").forEach((el) => el.classList.remove("pb-data-grid__group-panel--drop"));
  root.classList.remove("pb-data-grid--drop-target");
}

function isRtl(root) {
  return getComputedStyle(root).direction === "rtl";
}

function startColumnResize(root, state, event, handle) {
  const table = gridTable(root);
  const cells = measureCells(table);
  const cols = [...table.querySelectorAll(":scope > colgroup > col")];
  const index = cells.findIndex((c) => c.dataset.colKey === handle.dataset.colKey);
  if (index < 0 || cols.length !== cells.length) return;
  event.preventDefault();
  event.stopPropagation();

  const widths = cells.map((c) => c.getBoundingClientRect().width);
  cols.forEach((col, i) => { col.style.width = `${widths[i]}px`; });
  const mode = state.options.resizeMode;
  let next = -1;
  if (mode === "next") {
    for (let i = index + 1; i < cells.length; i++) {
      if (cells[i].dataset.colKey) { next = i; break; }
    }
  }
  const tableWidth = table.getBoundingClientRect().width;
  const originalWidth = table.style.width;
  table.style.width = `${tableWidth}px`;
  const min = Number(cells[index].dataset.minWidth || 40);
  const nextMin = next >= 0 ? Number(cells[next].dataset.minWidth || 40) : 0;
  const startX = event.clientX;
  const direction = isRtl(root) ? -1 : 1;
  root.classList.add("pb-data-grid--resizing");
  // A draggable header would start a native drag (and cancel the pointer) on the first move.
  const header = handle.closest("th");
  const wasDraggable = header?.getAttribute("draggable");
  header?.removeAttribute("draggable");
  try { handle.setPointerCapture(event.pointerId); } catch { /* synthetic event */ }

  const move = (e) => {
    let dx = (e.clientX - startX) * direction;
    if (next >= 0) {
      dx = Math.min(Math.max(dx, min - widths[index]), widths[next] - nextMin);
      cols[index].style.width = `${widths[index] + dx}px`;
      cols[next].style.width = `${widths[next] - dx}px`;
    } else {
      const width = Math.max(min, widths[index] + dx);
      cols[index].style.width = `${width}px`;
      table.style.width = `${tableWidth + width - widths[index]}px`;
    }
    syncFixedColumns(root);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    root.classList.remove("pb-data-grid--resizing");
    if (wasDraggable !== null && header) header.setAttribute("draggable", wasDraggable);
    // Blazor only rewrites the style attribute when its own value changes: put back what it rendered.
    if (next >= 0 || mode !== "container") table.style.width = originalWidth;
    // The click that ends a drag on the header must not sort.
    const swallow = (e) => { e.stopPropagation(); e.preventDefault(); };
    window.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    const keys = [];
    const result = [];
    cells.forEach((cell, i) => {
      if (cell.dataset.colKey) {
        keys.push(cell.dataset.colKey);
        result.push(parseFloat(cols[i].style.width));
      }
    });
    state.dotNet.invokeMethodAsync("OnColumnsResized", keys, result);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}

function groupPanelIndex(panel, x, rtl) {
  const chips = [...panel.querySelectorAll(".pb-data-grid__group-chip")].filter((c) => !c.classList.contains("pb-data-grid__group-chip--dragging"));
  let index = 0;
  chips.forEach((chip, i) => {
    const r = chip.getBoundingClientRect();
    const middle = r.left + r.width / 2;
    if (rtl ? x < middle : x > middle) index = i + 1;
  });
  return index;
}

function rowDropAllowed(state) {
  if (!gridDrag || gridDrag.kind !== "row" || !state.options.acceptsDrops) return false;
  if (gridDrag.group !== state.options.dragGroup) return false;
  return gridDrag.gridId === state.options.gridId ? gridDrag.allowInternal : gridDrag.allowExternal;
}

function onGridDragStart(root, state, event) {
  if (gridOf(event.target) !== root) return;
  // A resize drag starts on a draggable header: keep the browser from turning it into a column drag.
  if (root.classList.contains("pb-data-grid--resizing") || event.target.closest?.(".pb-data-grid__resizer")) {
    event.preventDefault();
    return;
  }
  const handle = event.target.closest?.(".pb-data-grid__drag-handle");
  if (handle) {
    const row = handle.closest("tr[data-row]");
    if (!row || !state.options.dragGroup) return;
    gridDrag = {
      kind: "row",
      gridId: state.options.gridId,
      group: state.options.dragGroup,
      allowInternal: state.options.allowInternal,
      allowExternal: state.options.allowExternal,
    };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "");
    try { event.dataTransfer.setDragImage(row, 24, 24); } catch { /* not supported */ }
    row.classList.add("pb-data-grid__row--dragging");
    state.dotNet.invokeMethodAsync("OnRowDragStart", Number(row.dataset.row));
    return;
  }
  const header = event.target.closest?.("th[data-col-key][draggable='true'], .pb-data-grid__group-chip");
  if (header && state.options.columnDrag) {
    gridDrag = { kind: "column", gridId: state.options.gridId, key: header.dataset.colKey, fromPanel: header.classList.contains("pb-data-grid__group-chip") };
    header.classList.add(header.matches("th") ? "pb-data-grid__header-cell--dragging" : "pb-data-grid__group-chip--dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", header.dataset.colKey);
  }
}

function columnDropTarget(root, event) {
  const panel = event.target.closest?.("[data-pb-group-panel]");
  if (panel && gridOf(panel) === root) return { panel };
  const th = event.target.closest?.("th[data-col-key]");
  if (th && gridOf(th) === root) return { th };
  const head = event.target.closest?.("thead");
  if (head && gridOf(head) === root) return { head };
  return null;
}

function onGridDragOver(root, state, event) {
  if (!gridDrag || gridOf(event.target) !== root) return;
  clearDropMarks(root);
  if (gridDrag.kind === "column") {
    if (gridDrag.gridId !== state.options.gridId) return;
    const target = columnDropTarget(root, event);
    if (!target) return;
    if (target.panel) {
      event.preventDefault();
      target.panel.classList.add("pb-data-grid__group-panel--drop");
    } else if ((target.th || target.head) && gridDrag.fromPanel) {
      event.preventDefault();
    } else if (target.th && target.th.dataset.colKey !== gridDrag.key) {
      event.preventDefault();
      const r = target.th.getBoundingClientRect();
      const after = (event.clientX - r.left > r.width / 2) !== isRtl(root);
      target.th.classList.add(after ? "pb-data-grid__drop-after" : "pb-data-grid__drop-before");
    }
    return;
  }
  if (!rowDropAllowed(state)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const row = event.target.closest?.("tbody > tr[data-row]");
  if (row && gridOf(row) === root) {
    row.classList.add("pb-data-grid__row--drop-" + rowDropPosition(state, row, event.clientY));
  } else {
    root.classList.add("pb-data-grid--drop-target");
  }
}

/** Where a row drop lands: the upper or lower half, or (tree mode) the middle half makes it a child. */
function rowDropPosition(state, row, clientY) {
  const r = row.getBoundingClientRect();
  const y = (clientY - r.top) / r.height;
  if (state.options.treeDrop) return y < 0.25 ? "before" : y > 0.75 ? "after" : "inside";
  return y < 0.5 ? "before" : "after";
}

function onGridDrop(root, state, event) {
  if (!gridDrag || gridOf(event.target) !== root) return;
  const drag = gridDrag;
  clearDropMarks(root);
  if (drag.kind === "column") {
    if (drag.gridId !== state.options.gridId) return;
    const target = columnDropTarget(root, event);
    if (!target) return;
    event.preventDefault();
    if (target.panel) {
      state.dotNet.invokeMethodAsync("OnColumnDrop", drag.key, null, "group", groupPanelIndex(target.panel, event.clientX, isRtl(root)));
    } else if (drag.fromPanel) {
      state.dotNet.invokeMethodAsync("OnColumnDrop", drag.key, null, "ungroup", -1);
    } else if (target.th && target.th.dataset.colKey !== drag.key) {
      const r = target.th.getBoundingClientRect();
      const after = (event.clientX - r.left > r.width / 2) !== isRtl(root);
      state.dotNet.invokeMethodAsync("OnColumnDrop", drag.key, target.th.dataset.colKey, after ? "after" : "before", -1);
    }
    gridDrag = null;
    return;
  }
  if (!rowDropAllowed(state)) return;
  event.preventDefault();
  const row = event.target.closest?.("tbody > tr[data-row]");
  if (row && gridOf(row) === root) {
    state.dotNet.invokeMethodAsync("OnRowDrop", drag.gridId, Number(row.dataset.row), rowDropPosition(state, row, event.clientY));
  } else {
    state.dotNet.invokeMethodAsync("OnRowDrop", drag.gridId, -1, "after");
  }
  gridDrag = null;
}

const GRID_ROW_KEYS = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "PageDown", "PageUp", " "];

export function gridInit(root, dotNet, options) {
  if (!root || gridStates.has(root)) return;
  const state = { dotNet, options };
  const handlers = {
    pointerdown: (e) => {
      const handle = e.target.closest?.(".pb-data-grid__resizer");
      if (handle && gridOf(handle) === root && state.options.resizeMode && e.button === 0) startColumnResize(root, state, e, handle);
    },
    dragstart: (e) => onGridDragStart(root, state, e),
    dragover: (e) => onGridDragOver(root, state, e),
    dragleave: (e) => { if (!root.contains(e.relatedTarget)) clearDropMarks(root); },
    drop: (e) => onGridDrop(root, state, e),
    dragend: () => {
      gridDrag = null;
      document.querySelectorAll(".pb-data-grid__row--dragging, .pb-data-grid__header-cell--dragging, .pb-data-grid__group-chip--dragging")
        .forEach((el) => el.classList.remove("pb-data-grid__row--dragging", "pb-data-grid__header-cell--dragging", "pb-data-grid__group-chip--dragging"));
      clearDropMarks(root);
    },
    keydown: (e) => {
      if (gridOf(e.target) !== root) return;
      if (e.target.matches?.("tr[data-row], .pb-data-grid__new-item-row") && GRID_ROW_KEYS.includes(e.key)) e.preventDefault();
      if (e.target.matches?.("th[tabindex]") && (e.key === " " || e.key === "Enter")) e.preventDefault();
    },
  };
  for (const [name, handler] of Object.entries(handlers)) root.addEventListener(name, handler);
  let lastWidth = 0;
  state.observer = new ResizeObserver(() => {
    syncFixedColumns(root);
    const width = root.clientWidth;
    if (state.options.adaptivity && Math.abs(width - lastWidth) >= 1) {
      lastWidth = width;
      state.dotNet.invokeMethodAsync("OnGridResized", width);
    }
  });
  state.observer.observe(root);
  state.handlers = handlers;
  gridStates.set(root, state);
  syncFixedColumns(root);
}

export function gridSync(root, options) {
  const state = gridStates.get(root);
  if (!state) return;
  const adaptivityChanged = options.adaptivity && !state.options.adaptivity;
  state.options = options;
  syncFixedColumns(root);
  if (adaptivityChanged) state.dotNet.invokeMethodAsync("OnGridResized", root.clientWidth);
}

export function gridDispose(root) {
  const state = gridStates.get(root);
  if (!state) return;
  for (const [name, handler] of Object.entries(state.handlers)) root.removeEventListener(name, handler);
  state.observer.disconnect();
  gridStates.delete(root);
}

/** Natural content width of every leaf column (auto fit). */
export function gridMeasureContent(root) {
  const table = gridTable(root);
  if (!table) return {};
  const cols = [...table.querySelectorAll(":scope > colgroup > col")];
  const saved = cols.map((c) => c.style.width);
  const savedWidth = table.style.width;
  cols.forEach((c) => { if (c.dataset.colKey) c.style.width = ""; });
  root.classList.add("pb-data-grid--measuring");
  table.style.width = "max-content";
  const result = {};
  measureCells(table).forEach((cell) => {
    if (cell.dataset.colKey) result[cell.dataset.colKey] = Math.max(Number(cell.dataset.minWidth || 40), cell.getBoundingClientRect().width + 1);
  });
  root.classList.remove("pb-data-grid--measuring");
  table.style.width = savedWidth;
  cols.forEach((c, i) => { c.style.width = saved[i]; });
  return result;
}

/** Shows `panel` (a popover) at a pointer position, like a context menu; closes on outside press or scroll. */
export function positionAtPoint(panel, x, y, options = {}) {
  if (!panel) return;
  unposition(panel);
  if (panel.hasAttribute("popover") && !panel.matches(":popover-open")) {
    try { panel.showPopover(); } catch { /* not connected */ }
  }
  const p = overlaySize(panel);
  const vp = viewport();
  const margin = 8;
  const rtl = getComputedStyle(panel).direction === "rtl";
  let left = rtl ? x - p.width : x;
  left = Math.min(Math.max(margin, left), vp.width - p.width - margin);
  let top = y;
  const above = top + p.height > vp.height - margin;
  if (above) top = Math.max(margin, y - p.height);
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
  panel.style.transformOrigin = `${rtl ? "right" : "left"} ${above ? "bottom" : "top"}`;
  panel.classList.remove("pb-overlay--pending");
  const close = () => options.dotNet?.invokeMethodAsync(options.closeMethod ?? "ClosePopup");
  const listener = (event) => {
    if (event?.type === "scroll" && panel.contains(event.target)) return;
    close();
  };
  const outside = (event) => {
    if (!event.composedPath().includes(panel)) close();
  };
  window.addEventListener("resize", listener);
  window.addEventListener("scroll", listener, true);
  document.addEventListener("pointerdown", outside, true);
  positioned.set(panel, { listener, outside });
}

/** Saves a file the server streamed (DotNetStreamReference) with the browser's download. */
export async function downloadFile(fileName, contentType, streamRef) {
  const buffer = await streamRef.arrayBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: contentType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------------- date editors
// PBDatepicker / PBDateRangePicker / PBCalendar helpers: the browser's UTC offset, touch-phone
// detection (Auto picker mode), input text sync, scroll picker snapping, and the date-time mask engine.

export function clientTimeOffset() {
  return -new Date().getTimezoneOffset();
}

export function isTouchPhone() {
  return window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 600;
}

export function setInputValue(input, value) {
  if (input && input.value !== (value ?? "")) input.value = value ?? "";
}

// Calendar cells move focus with arrows/Page/Home/End (handled in C#); keep the page from scrolling.
document.addEventListener("keydown", (event) => {
  if (event.target.matches?.(".pb-calendar__cell-button") && ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
  }
  if (event.target.matches?.(".pb-scroll-picker__column") && ["ArrowDown", "ArrowUp", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
    event.preventDefault();
  }
});

// ------------------------------------------------------------------ scroll picker

const scrollPickers = new WeakMap();

function itemHeight(column) {
  return column.querySelector(".pb-scroll-picker__item")?.offsetHeight || 40;
}

export function scrollPickerInit(root, dotNet) {
  if (!root || scrollPickers.has(root)) return;
  const state = { dotNet, timers: new Map(), syncing: 0 };
  // Scroll events don't bubble: listen in the capture phase for every column, current and future.
  state.onScroll = (event) => {
    const column = event.target;
    if (!column.classList?.contains("pb-scroll-picker__column") || state.syncing > Date.now()) return;
    clearTimeout(state.timers.get(column));
    state.timers.set(column, setTimeout(() => {
      const index = Math.round(column.scrollTop / itemHeight(column));
      dotNet.invokeMethodAsync("OnScrollPick", Number(column.dataset.column), index);
    }, 120));
  };
  root.addEventListener("scroll", state.onScroll, true);
  scrollPickers.set(root, state);
  scrollPickerSync(root, false);
}

/** Scrolls every column so its selected item sits in the middle band. */
export function scrollPickerSync(root, smooth) {
  const state = scrollPickers.get(root);
  if (!root) return;
  root.querySelectorAll(".pb-scroll-picker__column").forEach((column) => {
    const items = [...column.querySelectorAll(".pb-scroll-picker__item")];
    const index = items.findIndex((item) => item.classList.contains("pb-scroll-picker__item--selected"));
    if (index < 0) return;
    const top = index * itemHeight(column);
    if (Math.abs(column.scrollTop - top) <= 1) return;
    if (state) state.syncing = Date.now() + (smooth ? 400 : 80);
    column.scrollTo({ top, behavior: smooth ? "smooth" : "instant" });
  });
}

export function scrollPickerDispose(root) {
  const state = scrollPickers.get(root);
  if (!state) return;
  root.removeEventListener("scroll", state.onScroll, true);
  state.timers.forEach((timer) => clearTimeout(timer));
  scrollPickers.delete(root);
}

// ------------------------------------------------------------------ date-time mask
// The mask shows the value through the format's sections (day, month, month name, year, hours, minutes,
// seconds, AM/PM, UTC offset). The caret always selects one section: digits/letters type into it,
// Up/Down and the mouse wheel change it (carrying into the next section when cascading), Left/Right
// and Tab move between sections. Changes go to .NET through OnMaskChanged. With options.calendar
// "persian" the year, month and day are Persian (Jalali) fields, converted below.

const masks = new WeakMap();

const pad = (n, length) => String(Math.abs(n)).padStart(length, "0");

// Persian (Jalali) calendar: the 33-year-cycle algorithm with the official leap-year breaks (as .NET's PersianCalendar today).
const JALALI_BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
const idiv = (a, b) => Math.trunc(a / b);
const imod = (a, b) => a - Math.trunc(a / b) * b;

function jalaliYear(jy) {
  const gy = jy + 621;
  let leapJ = -14, jp = JALALI_BREAKS[0], jump = 0;
  for (let i = 1; i < JALALI_BREAKS.length; i++) {
    const jm = JALALI_BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += idiv(jump, 33) * 8 + idiv(imod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += idiv(n, 33) * 8 + idiv(imod(n, 33) + 3, 4);
  if (imod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const march = 20 + leapJ - (idiv(gy, 4) - idiv((idiv(gy, 100) + 1) * 3, 4) - 150);
  if (jump - n < 6) n = n - jump + idiv(jump + 4, 33) * 33;
  let leap = imod(imod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { gy, march, leap };
}

function gregorianToDay(gy, gm, gd) {
  const d = idiv((gy + idiv(gm - 8, 6) + 100100) * 1461, 4) + idiv(153 * imod(gm + 9, 12) + 2, 5) + gd - 34840408;
  return d - idiv(idiv(gy + 100100 + idiv(gm - 8, 6), 100) * 3, 4) + 752;
}

function dayToGregorian(jdn) {
  let j = 4 * jdn + 139361631;
  j += idiv(idiv(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = idiv(imod(j, 1461), 4) * 5 + 308;
  const month = imod(idiv(i, 153), 12) + 1;
  return { year: idiv(j, 1461) - 100100 + idiv(8 - month, 6), month, day: idiv(imod(i, 153), 5) + 1 };
}

function gregorianToJalali(year, month, day) {
  const jdn = gregorianToDay(year, month, day);
  const gy = dayToGregorian(jdn).year;
  let jy = gy - 621;
  const { march, leap } = jalaliYear(jy);
  let k = jdn - gregorianToDay(gy, 3, march);
  if (k >= 0) {
    if (k <= 185) return { year: jy, month: 1 + idiv(k, 31), day: imod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (leap === 1) k += 1;
  }
  return { year: jy, month: 7 + idiv(k, 30), day: imod(k, 30) + 1 };
}

function jalaliToGregorian(year, month, day) {
  const { gy, march } = jalaliYear(year);
  return dayToGregorian(gregorianToDay(gy, 3, march) + (month - 1) * 31 - idiv(month, 7) * (month - 7) + day - 1);
}

function daysIn(year, month, calendar) {
  if (calendar === "persian") return month <= 6 ? 31 : month <= 11 ? 30 : jalaliYear(year).leap === 0 ? 30 : 29;
  return new Date(year, month, 0).getDate();
}

/** A local Date from the calendar's fields. */
function partsToDate(parts, calendar) {
  const g = calendar === "persian" ? jalaliToGregorian(parts.year, parts.month, parts.day) : parts;
  const date = new Date(g.year, g.month - 1, g.day, parts.hour, parts.minute, parts.second);
  date.setFullYear(g.year);
  return date;
}

/** The calendar's year, month and day of a local Date. */
function dateFields(date, calendar) {
  const g = { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
  return calendar === "persian" ? gregorianToJalali(g.year, g.month, g.day) : g;
}

function today(defaultOffset, calendar) {
  return { ...dateFields(new Date(), calendar), hour: 0, minute: 0, second: 0, offset: defaultOffset ?? 0 };
}

function sectionText(state, section, parts) {
  const o = state.options;
  if (!parts) return section.kind === "literal" ? section.text : placeholder(section);
  switch (section.kind) {
    case "literal": return section.text;
    case "day": return section.length >= 2 ? pad(parts.day, 2) : String(parts.day);
    case "month": return section.length >= 2 ? pad(parts.month, 2) : String(parts.month);
    case "monthName": return (section.length === 3 ? o.monthAbbr : o.monthNames)[parts.month - 1];
    case "year": return section.length <= 2 ? pad(parts.year % 100, 2) : pad(parts.year, Math.max(4, section.length));
    case "hour24": return section.length >= 2 ? pad(parts.hour, 2) : String(parts.hour);
    case "hour12": { const h = parts.hour % 12 || 12; return section.length >= 2 ? pad(h, 2) : String(h); }
    case "minute": return section.length >= 2 ? pad(parts.minute, 2) : String(parts.minute);
    case "second": return section.length >= 2 ? pad(parts.second, 2) : String(parts.second);
    case "fraction": return "0".repeat(section.length);
    case "ampm": { const t = parts.hour < 12 ? o.am : o.pm; return section.length === 1 ? t.charAt(0) : t; }
    case "weekday": {
      const day = partsToDate(parts, o.calendar).getDay();
      return (section.length === 3 ? o.dayAbbr : o.dayNames)[day];
    }
    case "offset": {
      const sign = parts.offset < 0 ? "-" : "+";
      const h = Math.floor(Math.abs(parts.offset) / 60);
      const m = Math.abs(parts.offset) % 60;
      return section.length === 1 ? `${sign}${h}` : section.length === 2 ? `${sign}${pad(h, 2)}` : `${sign}${pad(h, 2)}:${pad(m, 2)}`;
    }
    default: return "";
  }
}

function placeholder(section) {
  switch (section.kind) {
    case "day": return "dd";
    case "month": return "mm";
    case "monthName": return section.length === 3 ? "mmm" : "month";
    case "year": return section.length <= 2 ? "yy" : "yyyy";
    case "hour24": case "hour12": return "hh";
    case "minute": return "mm";
    case "second": return "ss";
    case "fraction": return "f".repeat(section.length);
    case "ampm": return "--";
    case "weekday": return "---";
    case "offset": return "+00:00";
    default: return "";
  }
}

const EDITABLE = new Set(["day", "month", "monthName", "year", "hour24", "hour12", "minute", "second", "ampm", "offset"]);

function layout(state, parts) {
  let text = "";
  const editable = [];
  for (const section of state.options.sections) {
    const value = sectionText(state, section, parts);
    if (EDITABLE.has(section.kind)) editable.push({ section, start: text.length, end: text.length + value.length });
    text += value;
  }
  return { text, editable };
}

function render(state, select = true) {
  const input = state.input;
  const showEmpty = !state.parts && document.activeElement !== input;
  const { text, editable } = layout(state, state.parts);
  state.editable = editable;
  input.value = showEmpty ? "" : text;
  if (select && document.activeElement === input && editable.length) {
    const active = editable[Math.min(state.active, editable.length - 1)];
    try { input.setSelectionRange(active.start, active.end); } catch { /* not focusable */ }
  }
}

function notify(state, immediate) {
  clearTimeout(state.timer);
  const send = () => {
    const key = JSON.stringify(state.parts);
    if (key === state.sent) return;
    state.sent = key;
    state.dotNet.invokeMethodAsync("OnMaskChanged", state.parts ? { ...state.parts } : null);
  };
  if (immediate) send();
  else state.timer = setTimeout(send, 300);
}

function limits(kind, parts, calendar) {
  switch (kind) {
    case "day": return [1, daysIn(parts.year, parts.month, calendar)];
    case "month": case "monthName": return [1, 12];
    case "year": return [1, 9999];
    case "hour24": return [0, 23];
    case "hour12": return [1, 12];
    case "minute": case "second": return [0, 59];
    case "offset": return [-14 * 60, 14 * 60];
    default: return [0, 1];
  }
}

function setField(parts, kind, value, calendar) {
  const next = { ...parts };
  switch (kind) {
    case "day": next.day = value; break;
    case "month": case "monthName": next.month = value; break;
    case "year": next.year = value; break;
    case "hour24": next.hour = value; break;
    case "hour12": next.hour = (value % 12) + (parts.hour >= 12 ? 12 : 0); break;
    case "minute": next.minute = value; break;
    case "second": next.second = value; break;
    case "ampm": next.hour = (parts.hour % 12) + (value ? 12 : 0); break;
    case "offset": next.offset = value; break;
  }
  next.day = Math.min(next.day, daysIn(next.year, next.month, calendar));
  return next;
}

function fieldValue(parts, kind) {
  switch (kind) {
    case "day": return parts.day;
    case "month": case "monthName": return parts.month;
    case "year": return parts.year;
    case "hour24": return parts.hour;
    case "hour12": return parts.hour % 12 || 12;
    case "minute": return parts.minute;
    case "second": return parts.second;
    case "ampm": return parts.hour >= 12 ? 1 : 0;
    case "offset": return parts.offset;
    default: return 0;
  }
}

/** Up/Down: with cascading, overflow carries into the neighbouring unit (Dec 31 + 1 day = Jan 1 next year). */
function step(state, kind, delta) {
  const parts = state.parts;
  const calendar = state.options.calendar;
  if (kind === "offset") return setField(parts, kind, Math.max(-840, Math.min(840, parts.offset + delta * 60)), calendar);
  if (kind === "ampm") return setField(parts, kind, fieldValue(parts, kind) ? 0 : 1, calendar);
  if (state.options.cascade && calendar === "persian" && (kind === "month" || kind === "monthName" || kind === "year")) {
    // Months of the Persian calendar: the day is clamped to the new month (31 Shahrivar + 1 month = 30 Mehr).
    const index = parts.year * 12 + parts.month - 1 + (kind === "year" ? delta * 12 : delta);
    const year = Math.floor(index / 12);
    const month = index - year * 12 + 1;
    if (year < 1 || year > 9377) return parts;
    return { ...parts, year, month, day: Math.min(parts.day, daysIn(year, month, calendar)) };
  }
  if (state.options.cascade) {
    const date = partsToDate(parts, calendar);
    switch (kind) {
      case "day": date.setDate(date.getDate() + delta); break;
      case "month": case "monthName": {
        const day = date.getDate();
        date.setDate(1);
        date.setMonth(date.getMonth() + delta);
        date.setDate(Math.min(day, daysIn(date.getFullYear(), date.getMonth() + 1)));
        break;
      }
      case "year": date.setFullYear(date.getFullYear() + delta); break;
      case "hour24": case "hour12": date.setHours(date.getHours() + delta); break;
      case "minute": date.setMinutes(date.getMinutes() + delta); break;
      case "second": date.setSeconds(date.getSeconds() + delta); break;
    }
    if (date.getFullYear() < 1 || date.getFullYear() > 9999) return parts;
    return { ...parts, ...dateFields(date, calendar), hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds() };
  }
  const [min, max] = limits(kind, parts, calendar);
  let value = fieldValue(parts, kind) + delta;
  if (value > max) value = min;
  if (value < min) value = max;
  return setField(parts, kind, value, calendar);
}

function moveSection(state, delta) {
  const next = state.active + delta;
  if (next < 0 || next >= state.editable.length) return false;
  state.active = next;
  state.buffer = "";
  render(state);
  return true;
}

function typeDigit(state, digit) {
  const entry = state.editable[state.active];
  if (!entry) return;
  const kind = entry.section.kind;
  if (!state.parts) state.parts = today(state.options.defaultOffset, state.options.calendar);
  if (kind === "ampm" || kind === "offset") return;
  const maxDigits = kind === "year" ? (entry.section.length <= 2 ? 2 : 4) : 2;
  let buffer = state.buffer + digit;
  let value = Number(buffer);
  if (kind === "year" && entry.section.length <= 2) value = (state.options.calendar === "persian" ? 1400 : 2000) + value;
  const [min, max] = limits(kind === "monthName" ? "month" : kind, state.parts, state.options.calendar);
  if (kind !== "year" && value > max) {
    buffer = digit;
    value = Number(digit);
  }
  state.buffer = buffer;
  if (kind === "year") {
    state.parts = setField(state.parts, kind, Math.max(1, value), state.options.calendar);
  } else if (value >= min || buffer.length < maxDigits) {
    state.parts = setField(state.parts, kind, Math.max(min, Math.min(max, value)), state.options.calendar);
  }
  const complete = buffer.length >= maxDigits || (kind !== "year" && value * 10 > max);
  render(state);
  notify(state);
  if (complete) {
    state.buffer = "";
    if (state.options.caretMode === "advancing") moveSection(state, 1);
  }
}

function typeLetter(state, letter) {
  const entry = state.editable[state.active];
  if (!entry) return;
  const kind = entry.section.kind;
  if (!state.parts) state.parts = today(state.options.defaultOffset, state.options.calendar);
  if (kind === "ampm") {
    const l = letter.toLowerCase();
    if (state.options.am.toLowerCase().startsWith(l)) state.parts = setField(state.parts, kind, 0, state.options.calendar);
    else if (state.options.pm.toLowerCase().startsWith(l)) state.parts = setField(state.parts, kind, 1, state.options.calendar);
    else return;
  } else if (kind === "monthName") {
    state.buffer += letter.toLowerCase();
    const names = entry.section.length === 3 ? state.options.monthAbbr : state.options.monthNames;
    let index = names.findIndex((n) => n.toLowerCase().startsWith(state.buffer));
    if (index < 0) {
      state.buffer = letter.toLowerCase();
      index = names.findIndex((n) => n.toLowerCase().startsWith(state.buffer));
    }
    if (index < 0) return;
    state.parts = setField(state.parts, kind, index + 1, state.options.calendar);
  } else return;
  render(state);
  notify(state);
  if (kind === "ampm" && state.options.caretMode === "advancing") moveSection(state, 1);
}

function sectionAt(state, position) {
  let best = 0;
  state.editable.forEach((entry, i) => {
    if (position >= entry.start) best = i;
  });
  return best;
}

export function dateMaskInit(input, dotNet, options) {
  if (!input || masks.has(input)) return;
  const state = { input, dotNet, options, parts: options.value ? { ...options.value } : null, active: 0, buffer: "", editable: [], sent: JSON.stringify(options.value ?? null) };
  state.handlers = {
    focus: () => {
      state.buffer = "";
      setTimeout(() => render(state), 0);
    },
    blur: () => {
      state.buffer = "";
      render(state, false);
      notify(state, true);
    },
    mouseup: () => {
      if (document.activeElement !== input) return;
      state.active = sectionAt(state, input.selectionStart ?? 0);
      state.buffer = "";
      render(state);
    },
    keydown: (event) => {
      if (state.options.readOnly || event.ctrlKey && !["a", "A"].includes(event.key) || event.metaKey || event.altKey) return;
      const entry = state.editable[state.active];
      switch (event.key) {
        case "ArrowUp":
        case "ArrowDown":
          event.preventDefault();
          if (!entry) return;
          if (!state.parts) state.parts = today(state.options.defaultOffset, state.options.calendar);
          else state.parts = step(state, entry.section.kind, event.key === "ArrowUp" ? 1 : -1);
          state.buffer = "";
          render(state);
          notify(state);
          return;
        case "ArrowLeft":
          event.preventDefault();
          moveSection(state, -1);
          return;
        case "ArrowRight":
          event.preventDefault();
          moveSection(state, 1);
          return;
        case "Home":
          event.preventDefault();
          moveSection(state, -state.active);
          return;
        case "End":
          event.preventDefault();
          moveSection(state, state.editable.length - 1 - state.active);
          return;
        case "Tab":
          if (moveSection(state, event.shiftKey ? -1 : 1)) event.preventDefault();
          return;
        case "Backspace":
        case "Delete": {
          event.preventDefault();
          const all = input.selectionStart === 0 && input.selectionEnd === input.value.length && state.editable.length > 1;
          if (all || !state.parts) {
            state.parts = null;
            state.active = 0;
          } else if (entry) {
            const [min] = limits(entry.section.kind, state.parts, state.options.calendar);
            if (entry.section.kind !== "ampm" && entry.section.kind !== "offset") state.parts = setField(state.parts, entry.section.kind, entry.section.kind === "year" ? state.parts.year : min, state.options.calendar);
          }
          state.buffer = "";
          render(state);
          notify(state);
          return;
        }
        case "Enter":
          notify(state, true);
          return;
      }
      if (event.key === "a" && event.ctrlKey) return;
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        typeDigit(state, event.key);
      } else if (event.key === "+" || event.key === "-") {
        event.preventDefault();
        if (entry?.section.kind === "offset" && state.parts) {
          const magnitude = Math.abs(state.parts.offset);
          state.parts = setField(state.parts, "offset", event.key === "-" ? -magnitude : magnitude, state.options.calendar);
          render(state);
          notify(state);
        }
      } else if (event.key.length === 1) {
        event.preventDefault();
        if (/\p{L}/u.test(event.key)) typeLetter(state, event.key);
        else moveSection(state, 1); // a typed separator moves on
      }
    },
    wheel: (event) => {
      if (document.activeElement !== input || state.options.readOnly) return;
      event.preventDefault();
      const entry = state.editable[state.active];
      if (!entry) return;
      if (!state.parts) state.parts = today(state.options.defaultOffset, state.options.calendar);
      else state.parts = step(state, entry.section.kind, event.deltaY < 0 ? 1 : -1);
      render(state);
      notify(state);
    },
    // Anything that slips past keydown (IME, autofill, drag-and-drop text): restore the mask text.
    input: () => render(state),
    paste: (event) => event.preventDefault(),
  };
  for (const [name, handler] of Object.entries(state.handlers)) input.addEventListener(name, handler, name === "wheel" ? { passive: false } : undefined);
  masks.set(input, state);
  render(state, false);
}

export function dateMaskUpdate(input, options) {
  const state = masks.get(input);
  if (!state) return;
  state.options = options;
  state.parts = options.value ? { ...options.value } : null;
  state.sent = JSON.stringify(options.value ?? null);
  state.buffer = "";
  render(state, document.activeElement === input);
}

export function dateMaskDispose(input) {
  const state = masks.get(input);
  if (!state) return;
  clearTimeout(state.timer);
  for (const [name, handler] of Object.entries(state.handlers)) input.removeEventListener(name, handler);
  masks.delete(input);
}

// ---------------------------------------------------------------------------------- chips

const chipStates = new WeakMap();
const chipSelector = ":scope > [data-chip]";

/** The chips (input chips or tag templates) of a PBChips tag box, in order. */
function gridChips(root) {
  const grid = root?.querySelector(".pb-chip-grid");
  return grid ? [...grid.querySelectorAll(chipSelector)] : [];
}

/**
 * PBChips tag box keyboard handling (mat-chip-grid): `preventKeys` (separators like ",") never reach
 * the input text; Enter does not submit forms while there is text or an open list; Left/Backspace at
 * the start of the input move to the last chip; Left/Right/Home/End move between chips.
 */
export function chipsInit(root, input, preventKeys) {
  if (!root || !input || chipStates.has(root)) return;
  const onInputKey = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key;
    if (preventKeys.includes(key)) {
      event.preventDefault();
      return;
    }
    if (key === "Enter" && (input.value.trim() !== "" || input.getAttribute("aria-expanded") === "true")) event.preventDefault();
    if (key === "ArrowDown" || key === "ArrowUp") event.preventDefault();
    if ((key === "ArrowLeft" || key === "Backspace") && input.selectionStart === 0 && input.selectionEnd === 0) {
      const chips = gridChips(root);
      if (chips.length) {
        event.preventDefault();
        chips[chips.length - 1].focus();
      }
    }
  };
  const onChipKey = (event) => {
    const chip = event.target;
    if (!(chip instanceof HTMLElement) || !chip.matches("[data-chip]") || chip.tagName === "INPUT") return;
    const chips = gridChips(root);
    const index = chips.indexOf(chip);
    let next = null;
    switch (event.key) {
      case "ArrowLeft": next = chips[Math.max(0, index - 1)]; break;
      case "ArrowRight": next = chips[index + 1] ?? input; break;
      case "Home": next = chips[0]; break;
      case "End": next = input; break;
      case "Backspace": case "Delete": case "Enter": event.preventDefault(); return;
      default: return;
    }
    event.preventDefault();
    next?.focus();
  };
  input.addEventListener("keydown", onInputKey);
  root.addEventListener("keydown", onChipKey);
  chipStates.set(root, { input, onInputKey, onChipKey });
}

export function chipsDispose(root) {
  const state = chipStates.get(root);
  if (!state) return;
  state.input.removeEventListener("keydown", state.onInputKey);
  root.removeEventListener("keydown", state.onChipKey);
  chipStates.delete(root);
}

/** Focuses chip `index` of a tag box, or its input when there is no such chip. */
export function chipsFocusTag(root, index) {
  const chips = gridChips(root);
  (index >= 0 && index < chips.length ? chips[index] : root?.querySelector(".pb-chip-input"))?.focus();
}

/** Focuses (and selects) the text of the chip being edited. */
export function chipsFocusEdit(root) {
  const input = root?.querySelector(".pb-chip__edit-input");
  input?.focus();
  input?.select();
}

/** Scrolls a list so a row at `top` (px from the first row) of `height` is visible (virtual lists). */
export function scrollRowIntoView(panel, top, height) {
  if (!panel) return;
  const header = panel.querySelector(".pb-chips__columns-header");
  const headerHeight = header ? header.offsetHeight : 0;
  const rowTop = parseFloat(getComputedStyle(panel).paddingTop) + headerHeight + top;
  if (rowTop - headerHeight < panel.scrollTop) panel.scrollTop = rowTop - headerHeight;
  else if (rowTop + height > panel.scrollTop + panel.clientHeight) panel.scrollTop = rowTop + height - panel.clientHeight;
}

const reorderStates = new WeakMap();

/**
 * Drag-and-drop reordering of a chip set or a tag box's chips (cdkDropList with mixed orientation):
 * the chip follows the pointer as a lifted preview, an insertion bar marks the drop position, and
 * `dotNet.OnChipDrop(oldIndex, newIndex)` reports the move. Escape cancels.
 */
export function chipsReorderInit(root, dotNet) {
  if (!root || reorderStates.has(root)) return;
  const container = root.classList.contains("pb-chip-set") ? root : root.querySelector(".pb-chip-grid");
  if (!container) return;
  const chipsOf = () => [...container.children].filter((el) => el.matches("[data-chip], .pb-chip"));
  let drag = null;

  const clearMarks = () => container.querySelectorAll(".pb-chip--drop-before, .pb-chip--drop-after")
    .forEach((el) => el.classList.remove("pb-chip--drop-before", "pb-chip--drop-after"));

  const finish = (drop) => {
    const d = drag;
    drag = null;
    if (!d?.active) return;
    clearMarks();
    d.preview.remove();
    d.chip.classList.remove("pb-chip--drag-placeholder");
    container.classList.remove("pb-chip-set--dragging");
    const swallow = (event) => { event.stopPropagation(); event.preventDefault(); };
    window.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    if (drop && d.to != null && d.to !== d.from) dotNet.invokeMethodAsync("OnChipDrop", d.from, d.to);
  };

  const start = (event) => {
    const rect = drag.chip.getBoundingClientRect();
    drag.active = true;
    drag.from = chipsOf().indexOf(drag.chip);
    drag.to = drag.from;
    drag.offsetX = event.clientX - rect.left;
    drag.offsetY = event.clientY - rect.top;
    drag.vertical = getComputedStyle(container).flexDirection === "column";
    const preview = drag.chip.cloneNode(true);
    preview.classList.add("pb-chip-drag-preview");
    preview.removeAttribute("id");
    preview.setAttribute("aria-hidden", "true");
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    document.body.appendChild(preview);
    drag.preview = preview;
    drag.chip.classList.add("pb-chip--drag-placeholder");
    container.classList.add("pb-chip-set--dragging");
  };

  const target = (x, y) => {
    const chips = chipsOf();
    let best = null;
    let bestDistance = Infinity;
    for (const chip of chips) {
      const r = chip.getBoundingClientRect();
      const distance = Math.hypot(x - Math.max(r.left, Math.min(x, r.right)), y - Math.max(r.top, Math.min(y, r.bottom)));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = chip;
      }
    }
    clearMarks();
    if (!best) return;
    const r = best.getBoundingClientRect();
    const rtl = getComputedStyle(container).direction === "rtl";
    const after = drag.vertical ? y > r.top + r.height / 2 : (x > r.left + r.width / 2) !== rtl;
    let to = chips.indexOf(best) + (after ? 1 : 0);
    if (to > drag.from) to -= 1;
    drag.to = to;
    if (best !== drag.chip) best.classList.add(after ? "pb-chip--drop-after" : "pb-chip--drop-before");
  };

  const down = (event) => {
    if (event.button !== 0) return;
    const chip = event.target.closest("[data-chip], .pb-chip");
    if (!chip || chip.parentElement !== container) return;
    if (event.target.closest(".pb-chip__remove, input, .pb-chip--editing") || chip.matches(".pb-chip--disabled")) return;
    drag = { chip, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: false };
  };
  const move = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;
      start(event);
    }
    event.preventDefault();
    drag.preview.style.transform = `translate(${event.clientX - drag.offsetX}px, ${event.clientY - drag.offsetY}px)`;
    target(event.clientX, event.clientY);
  };
  const up = (event) => {
    if (drag && event.pointerId === drag.pointerId) finish(true);
  };
  const cancel = () => finish(false);
  const key = (event) => {
    if (event.key === "Escape" && drag?.active) {
      event.preventDefault();
      finish(false);
    }
  };

  container.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("keydown", key, true);
  reorderStates.set(root, { container, down, move, up, cancel, key });
}

export function chipsReorderDispose(root) {
  const state = reorderStates.get(root);
  if (!state) return;
  state.container.removeEventListener("pointerdown", state.down);
  window.removeEventListener("pointermove", state.move);
  window.removeEventListener("pointerup", state.up);
  window.removeEventListener("pointercancel", state.cancel);
  window.removeEventListener("keydown", state.key, true);
  reorderStates.delete(root);
}
