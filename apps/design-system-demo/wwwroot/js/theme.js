// Minimal theme interop: persistence + applying data-theme to <html>. All
// derivation of what to show/generate lives in Blazor (ThemeState.cs) and in
// the precomputed --md-sys-color-* CSS.

export function getStoredTheme() {
    return localStorage.getItem("theme") || document.documentElement.getAttribute("data-theme");
}

export function setStoredTheme(theme) {
    localStorage.setItem("theme", theme);
}

export function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
}
