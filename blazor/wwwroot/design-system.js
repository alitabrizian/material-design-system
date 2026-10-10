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

// ---------------------------------------------------------------------------------- data grid
// PBDataGrid: column resizing, header drag (reorder / group / ungroup), row drag and drop (within
// and between grids of one DragDropGroup), sticky fixed-column offsets, adaptivity width reports,
// and the browser defaults the grid's keyboard navigation must suppress. One delegated listener set
// per grid root; nested grids (master-detail) are told apart with closest(".pb-grid").

const gridStates = new WeakMap();
let gridDrag = null;

const gridOf = (el) => el?.closest?.(".pb-grid");
const gridTable = (root) => root.querySelector(".pb-grid__scroll > .pb-grid__table");
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
  root.querySelectorAll(".pb-grid__drop-before, .pb-grid__drop-after, .pb-grid__row--drop-before, .pb-grid__row--drop-after")
    .forEach((el) => el.classList.remove("pb-grid__drop-before", "pb-grid__drop-after", "pb-grid__row--drop-before", "pb-grid__row--drop-after"));
  root.querySelectorAll(".pb-grid__group-panel--drop").forEach((el) => el.classList.remove("pb-grid__group-panel--drop"));
  root.classList.remove("pb-grid--drop-target");
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
  root.classList.add("pb-grid--resizing");
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
    root.classList.remove("pb-grid--resizing");
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
  const chips = [...panel.querySelectorAll(".pb-grid__group-chip")].filter((c) => !c.classList.contains("pb-grid__group-chip--dragging"));
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
  if (root.classList.contains("pb-grid--resizing") || event.target.closest?.(".pb-grid__resizer")) {
    event.preventDefault();
    return;
  }
  const handle = event.target.closest?.(".pb-grid__drag-handle");
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
    row.classList.add("pb-grid__row--dragging");
    state.dotNet.invokeMethodAsync("OnRowDragStart", Number(row.dataset.row));
    return;
  }
  const header = event.target.closest?.("th[data-col-key][draggable='true'], .pb-grid__group-chip");
  if (header && state.options.columnDrag) {
    gridDrag = { kind: "column", gridId: state.options.gridId, key: header.dataset.colKey, fromPanel: header.classList.contains("pb-grid__group-chip") };
    header.classList.add(header.matches("th") ? "pb-grid__header-cell--dragging" : "pb-grid__group-chip--dragging");
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
      target.panel.classList.add("pb-grid__group-panel--drop");
    } else if ((target.th || target.head) && gridDrag.fromPanel) {
      event.preventDefault();
    } else if (target.th && target.th.dataset.colKey !== gridDrag.key) {
      event.preventDefault();
      const r = target.th.getBoundingClientRect();
      const after = (event.clientX - r.left > r.width / 2) !== isRtl(root);
      target.th.classList.add(after ? "pb-grid__drop-after" : "pb-grid__drop-before");
    }
    return;
  }
  if (!rowDropAllowed(state)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const row = event.target.closest?.("tbody > tr[data-row]");
  if (row && gridOf(row) === root) {
    const r = row.getBoundingClientRect();
    row.classList.add(event.clientY < r.top + r.height / 2 ? "pb-grid__row--drop-before" : "pb-grid__row--drop-after");
  } else {
    root.classList.add("pb-grid--drop-target");
  }
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
    const r = row.getBoundingClientRect();
    state.dotNet.invokeMethodAsync("OnRowDrop", drag.gridId, Number(row.dataset.row), event.clientY < r.top + r.height / 2 ? "before" : "after");
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
      const handle = e.target.closest?.(".pb-grid__resizer");
      if (handle && gridOf(handle) === root && state.options.resizeMode && e.button === 0) startColumnResize(root, state, e, handle);
    },
    dragstart: (e) => onGridDragStart(root, state, e),
    dragover: (e) => onGridDragOver(root, state, e),
    dragleave: (e) => { if (!root.contains(e.relatedTarget)) clearDropMarks(root); },
    drop: (e) => onGridDrop(root, state, e),
    dragend: () => {
      gridDrag = null;
      document.querySelectorAll(".pb-grid__row--dragging, .pb-grid__header-cell--dragging, .pb-grid__group-chip--dragging")
        .forEach((el) => el.classList.remove("pb-grid__row--dragging", "pb-grid__header-cell--dragging", "pb-grid__group-chip--dragging"));
      clearDropMarks(root);
    },
    keydown: (e) => {
      if (gridOf(e.target) !== root) return;
      if (e.target.matches?.("tr[data-row], .pb-grid__new-item-row") && GRID_ROW_KEYS.includes(e.key)) e.preventDefault();
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
  root.classList.add("pb-grid--measuring");
  table.style.width = "max-content";
  const result = {};
  measureCells(table).forEach((cell) => {
    if (cell.dataset.colKey) result[cell.dataset.colKey] = Math.max(Number(cell.dataset.minWidth || 40), cell.getBoundingClientRect().width + 1);
  });
  root.classList.remove("pb-grid--measuring");
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
