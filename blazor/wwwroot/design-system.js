// Real M3 ripple (m3.material.io/foundations/interaction/states) -- a state
// layer that expands from the pointer's down position and fades out. Uses
// event delegation on `document` so it works for any current or future
// Blazor-rendered content without per-element wiring.
const RIPPLE_TARGETS = [
  ".pb-button",
  ".workspace-button-toggle",
  ".pb-menu-item",
  ".workspace-chips [role=\"listitem\"]",
  ".workspace-tab",
  ".workspace-ripples",
].join(", ");

function addRipple(target, event) {
  if (target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true") {
    return;
  }

  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.6;
  const ripple = document.createElement("span");
  ripple.className = "workspace-ripple-effect";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

  if (getComputedStyle(target).position === "static") {
    target.style.position = "relative";
  }
  if (!target.style.overflow) {
    target.style.overflow = "hidden";
  }

  target.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

document.addEventListener("pointerdown", (event) => {
  const target = event.target.closest(RIPPLE_TARGETS);
  if (target) {
    addRipple(target, event);
  }
});
