/**
 * Figma Motion close: adds `className` to `element` and resolves once the CSS animations it starts have
 * finished, so the caller removes the element after its closing motion (styles/material-motion.css).
 * Resolves at once when there is nothing to wait for (no element, or prefers-reduced-motion made the
 * duration 0ms); a cancelled animation (the element opened again) also resolves it. Same as playExit in
 * the Blazor design-system.js.
 */
export async function playExit(element: Element | null | undefined, className: string): Promise<void> {
  if (!element?.isConnected) return;
  element.classList.add(className);
  await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
}
