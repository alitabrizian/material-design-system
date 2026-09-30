// PartoBita design system runtime helpers (loaded once as an ES module).
//
//  - Ripple: MatRipple-style ink under the pointer for any element with `pb-ripple-host`. Uses
//    event delegation on `document`, so it works for all current and future Blazor-rendered content.
//  - Overlay positioning: CDK FlexibleConnectedPositionStrategy-like placement of menu/select/
//    autocomplete panels with position:fixed (never clipped by an ancestor's overflow).
//  - Dialog + focus helpers used by PBDialog, PBMenu, PBSelect.
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
 *   x: "start" | "end", y: "below" | "above", overlap: bool, matchWidth: bool, offset: px,
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
  clearTimeout(tip._pbHideTimer);
  tip.classList.remove("pb-tooltip--hiding");
  const trigger = host.querySelector("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
  if (trigger && trigger !== tip && !trigger.hasAttribute("aria-describedby")) {
    trigger.setAttribute("aria-describedby", tip.id);
  }
  if (!tip.matches(":popover-open")) {
    try { tip.showPopover(); } catch { return; }
  }
  placeTooltip(host, tip);
}

function hideTooltip(host) {
  const tip = tooltipOf(host);
  if (!tip || !tip.matches(":popover-open")) return;
  tip.classList.add("pb-tooltip--hiding");
  tip._pbHideTimer = setTimeout(() => {
    try { tip.hidePopover(); } catch { /* removed */ }
    tip.classList.remove("pb-tooltip--hiding");
  }, 75);
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
