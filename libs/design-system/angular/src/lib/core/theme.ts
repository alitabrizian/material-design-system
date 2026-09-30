import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

/** The themes @partobita/design-tokens ships (see its data/palettes.json). */
export type PbTheme = 'rose-red' | 'azure-blue' | 'magenta-violet' | 'cyan-orange';

export const PB_THEMES: readonly PbTheme[] = ['rose-red', 'azure-blue', 'magenta-violet', 'cyan-orange'];

export const PB_DEFAULT_THEME: PbTheme = 'rose-red';

/**
 * Switches the design-tokens theme by setting data-theme on <html>. Any element can also carry its own
 * data-theme attribute to re-theme just its subtree.
 */
@Injectable({ providedIn: 'root' })
export class PbThemeService {
  private readonly root = inject(DOCUMENT).documentElement;

  readonly theme = signal<PbTheme>(this.current());

  set(theme: PbTheme): void {
    this.root.setAttribute('data-theme', theme);
    this.theme.set(theme);
  }

  private current(): PbTheme {
    const value = this.root.getAttribute('data-theme');
    return PB_THEMES.find((theme) => theme === value) ?? PB_DEFAULT_THEME;
  }
}
