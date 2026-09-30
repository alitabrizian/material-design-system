import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PbButton, PbMenu, PbMenuItem, PbTheme, PbThemeService, PbTooltip } from '@partobita/design-system-angular';

interface ThemeOption {
  key: PbTheme;
  name: string;
  dark: boolean;
}

/**
 * Angular Material's docs navbar, as in the Blazor docs: primary-container toolbar, text-button brand
 * and section link, then the theme picker after a spacer.
 */
@Component({
  selector: 'docs-top-app-bar',
  imports: [PbButton, PbMenu, PbMenuItem, PbTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './top-app-bar.html',
})
export class TopAppBar {
  protected readonly themes = inject(PbThemeService);
  protected readonly options: readonly ThemeOption[] = [
    { key: 'rose-red', name: 'Rose & Red', dark: false },
    { key: 'azure-blue', name: 'Azure & Blue', dark: false },
    { key: 'magenta-violet', name: 'Magenta & Violet', dark: true },
    { key: 'cyan-orange', name: 'Cyan & Orange', dark: true },
  ];

  /** Applies a theme and remembers it (index.html reapplies it before first paint). */
  protected select(theme: PbTheme): void {
    this.themes.set(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Storage blocked (private mode): the theme still applies, it just isn't remembered.
    }
  }
}
