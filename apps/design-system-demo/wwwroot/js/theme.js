// Theme interop for the demo's picker. The inline script in App.razor applies the saved theme
// before first paint; these helpers read it back and switch it live (no reload).

const THEMES = ["rose-red", "azure-blue", "magenta-violet", "cyan-orange"];

export function getTheme() {
  return document.documentElement.getAttribute("data-theme");
}

/** Applies a theme immediately and persists it. Storage failures (private mode) only lose persistence. */
export function selectTheme(theme) {
  if (!THEMES.includes(theme)) return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* storage unavailable */
  }
}
