// Wires the framework cards and links to each design system's docs site, and runs the theme picker.
//
// docs-links.json maps a framework to its docs address (null = not published yet). Any element with
// data-framework gets href = that address + its data-route; a framework without an address renders
// as "coming soon" and its links stay inert. "{host}" in an address is replaced with the host name the
// page was opened from, so the links work from other machines on the network, not only on localhost.

const THEME_KEY = "pb-landing-theme";
const READY_LABEL = "مشاهده‌ی مستندات";
const SOON_LABEL = "به‌زودی";

/** @type {Record<string, string | null>} */
let links = {};

function docsUrl(framework, route) {
  const base = links[framework];
  if (!base) return null;
  return base.replaceAll("{host}", location.hostname || "localhost").replace(/\/+$/, "") + (route && route !== "/" ? route : "/");
}

function applyLinks() {
  for (const el of document.querySelectorAll("[data-framework]")) {
    const url = docsUrl(el.dataset.framework, el.dataset.route);
    if (url) {
      el.setAttribute("href", url);
      el.removeAttribute("aria-disabled");
    } else {
      el.removeAttribute("href");
      el.setAttribute("aria-disabled", "true");
    }

    if (el.classList.contains("framework-card")) {
      el.classList.toggle("framework-card--soon", !url);
      const status = el.querySelector("[data-status]");
      status.textContent = url ? READY_LABEL : SOON_LABEL;
      status.className = `framework-card__status framework-card__status--${url ? "ready" : "soon"}`;
    }
  }
}

// ------------------------------------------------------------------ popular components

function selectComponentFramework(framework) {
  for (const button of document.querySelectorAll("[data-component-framework]")) {
    button.setAttribute("aria-checked", String(button.dataset.componentFramework === framework));
  }
  for (const tile of document.querySelectorAll(".component-tile")) {
    tile.dataset.framework = framework;
  }
  applyLinks();
}

document.querySelector(".segmented").addEventListener("click", (event) => {
  const button = event.target.closest("[data-component-framework]");
  if (button) selectComponentFramework(button.dataset.componentFramework);
});

// ------------------------------------------------------------------ theme picker

const themeButton = document.getElementById("theme-button");
const themeMenu = document.getElementById("theme-menu");

function markTheme() {
  const current = document.documentElement.dataset.theme;
  for (const option of themeMenu.querySelectorAll("[data-theme-option]")) {
    option.setAttribute("aria-checked", String(option.dataset.themeOption === current));
  }
}

function setMenuOpen(open) {
  themeMenu.hidden = !open;
  themeButton.setAttribute("aria-expanded", String(open));
  if (open) themeMenu.querySelector("[aria-checked='true']")?.focus();
}

themeButton.addEventListener("click", () => setMenuOpen(themeMenu.hidden));

themeMenu.addEventListener("click", (event) => {
  const option = event.target.closest("[data-theme-option]");
  if (!option) return;
  document.documentElement.dataset.theme = option.dataset.themeOption;
  try {
    localStorage.setItem(THEME_KEY, option.dataset.themeOption);
  } catch {
    // Storage unavailable (private mode): the theme still applies for this visit.
  }
  markTheme();
  setMenuOpen(false);
  themeButton.focus();
});

document.addEventListener("click", (event) => {
  if (!themeMenu.hidden && !event.target.closest(".theme-picker")) setMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !themeMenu.hidden) {
    setMenuOpen(false);
    themeButton.focus();
  }
});

// ------------------------------------------------------------------ start

markTheme();
selectComponentFramework("angular");

try {
  const response = await fetch("docs-links.json", { cache: "no-cache" });
  links = await response.json();
} catch (error) {
  console.error("Could not load docs-links.json", error);
}
applyLinks();
