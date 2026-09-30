import { Easing } from "remotion";
import palettes from "../../../libs/material-design-system/tokens/dist/data/palettes.json";

/**
 * Reads the design tokens back out of the stylesheets Root.tsx imports, so the token videos show
 * whatever libs/material-design-system/tokens currently builds -- role names, counts and values are never
 * copied into this project.
 */

export type ThemeMeta = { id: string; name: string; mode: string; primary: string; secondary: string; tertiary: string };

export const themes: ThemeMeta[] = Object.entries(palettes.themes).map(([id, t]) => ({ id, ...t }));

type TokenSheet = {
  /** Custom properties declared on :root (system tokens: typescale, shape, elevation, motion...). */
  root: Record<string, string>;
  /** Custom properties declared per [data-theme="..."] (the color roles). */
  byTheme: Record<string, Record<string, string>>;
};

let cache: TokenSheet | null = null;

export function tokenSheet(): TokenSheet {
  if (cache) return cache;
  const root: Record<string, string> = {};
  const byTheme: Record<string, Record<string, string>> = {};

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule)) continue;
      const selectors = rule.selectorText.split(",").map((s) => s.trim());
      for (let i = 0; i < rule.style.length; i++) {
        const prop = rule.style[i];
        if (!prop.startsWith("--md-")) continue;
        const value = rule.style.getPropertyValue(prop).trim();
        for (const selector of selectors) {
          const theme = selector.match(/^\[data-theme="([^"]+)"\]$/)?.[1];
          if (theme) (byTheme[theme] ??= {})[prop] = value;
          else if (selector === ":root") root[prop] = value;
        }
      }
    }
  }

  cache = { root, byTheme };
  return cache;
}

/** The resolved value of a system token, e.g. sys("shape-corner-large") -> "16px". */
export const sys = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--md-sys-${name}`).trim();

/** Every --md-sys-* token on :root whose name starts with the prefix, in stylesheet order. */
export function sysGroup(prefix: string): { name: string; value: string }[] {
  const full = `--md-sys-${prefix}`;
  return Object.keys(tokenSheet().root)
    .filter((prop) => prop.startsWith(full))
    .map((prop) => ({ name: prop.slice("--md-sys-".length), value: sys(prop.slice("--md-sys-".length)) }));
}

/** Names of the color roles (without the --md-sys-color- prefix) the given theme defines. */
export function colorRoles(theme = themes[0].id): string[] {
  return Object.keys(tokenSheet().byTheme[theme] ?? {})
    .filter((prop) => prop.startsWith("--md-sys-color-"))
    .map((prop) => prop.slice("--md-sys-color-".length));
}

export const px = (value: string) => parseFloat(value) || 0;

/** Turns a motion easing token (cubic-bezier(...) or linear) into a Remotion easing function. */
export function easingOf(value: string): (t: number) => number {
  const bezier = value.match(/cubic-bezier\(([^)]+)\)/);
  if (!bezier) return Easing.linear;
  const [x1, y1, x2, y2] = bezier[1].split(",").map(Number);
  return Easing.bezier(x1, y1, x2, y2);
}

/** Interpolates between two box-shadow values of the same shape (as all elevation levels are). */
export function mixShadow(from: string, to: string, t: number): string {
  const numbers = from.match(/-?\d*\.?\d+/g)!.map(Number);
  let i = 0;
  return to.replace(/-?\d*\.?\d+/g, (n) => {
    const a = numbers[i++] ?? 0;
    return String(a + (Number(n) - a) * t);
  });
}

export const titleCase = (name: string) =>
  name
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
