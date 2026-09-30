import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { PbButton, PbList, PbListItem, PbSidenav } from '@partobita/design-system-angular';
import { filter, map } from 'rxjs';
import { COMPONENT_CATALOG } from './component-catalog';
import { TopAppBar } from './top-app-bar/top-app-bar';

/**
 * The docs shell, same layout as the Blazor docs (Angular Material's docs layout): the toolbar, then a
 * 240px component list beside the page on wide screens, or a "Menu" header that opens it as a drawer.
 */
@Component({
  selector: 'docs-root',
  imports: [NgTemplateOutlet, RouterOutlet, TopAppBar, PbButton, PbList, PbListItem, PbSidenav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(click)': 'routeLinkClick($event)' },
  templateUrl: './app.html',
})
export class App {
  protected readonly catalog = COMPONENT_CATALOG;
  protected readonly drawerOpen = signal(false);

  private readonly router = inject(Router);
  private readonly origin = inject(DOCUMENT).location.origin;

  /** The current path without query or fragment, e.g. "/button". */
  protected readonly path = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url.split(/[?#]/)[0]),
    ),
    { initialValue: '/' },
  );

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => this.drawerOpen.set(false));
  }

  /**
   * pb-list-item and pb-button render plain <a href> links, so same-origin link clicks are handed to
   * the router here instead of reloading the page.
   */
  protected routeLinkClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const link = (event.target as Element | null)?.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.origin !== this.origin) return;
    event.preventDefault();
    void this.router.navigateByUrl(link.pathname + link.search + link.hash);
  }
}
