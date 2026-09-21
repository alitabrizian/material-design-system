// Minimal theme interop: persistence + applying data-theme/data-palette to
// <html>. All derivation of what to show/generate lives in Blazor
// (ThemeState.cs) and in the precomputed --md-sys-color-* CSS.

export function getStoredTheme() {
    return {
        theme: localStorage.getItem("theme") || document.documentElement.getAttribute("data-theme"),
        palette: localStorage.getItem("palette") || document.documentElement.getAttribute("data-palette"),
    };
}

export function setStoredTheme(theme, palette) {
    localStorage.setItem("theme", theme);
    localStorage.setItem("palette", palette);
}

export function applyTheme(theme, palette) {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-palette", palette);
}
