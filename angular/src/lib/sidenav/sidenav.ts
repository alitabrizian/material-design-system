import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';

export type PbSidenavMode = 'standard' | 'over';
export type PbSidenavPosition = 'start' | 'end';

/**
 * Side navigation drawer next to the main content (PBSidenav). The drawer holds the [pbSidenavPanel]
 * element; everything else is the main content. In standard mode the drawer is the Figma Layout page's
 * sidebar: 240px wide, 72px when collapsed.
 *
 *   <pb-sidenav [(opened)]="menuOpen" mode="over">
 *     <nav pbSidenavPanel>...</nav>
 *     <main>...</main>
 *   </pb-sidenav>
 */
@Component({
  selector: 'pb-sidenav',
  imports: [MatSidenavContainer, MatSidenav, MatSidenavContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.css',
  host: {
    class: 'pb-sidenav',
    '[class.pb-sidenav--side]': "mode() !== 'over'",
    '[class.pb-sidenav--over]': "mode() === 'over'",
    '[class.pb-sidenav--collapsed]': "mode() !== 'over' && collapsed()",
  },
})
export class PbSidenav {
  readonly mode = input<PbSidenavMode>('standard');
  readonly position = input<PbSidenavPosition>('start');
  readonly opened = model(true);
  /** Standard mode only: the collapsed sidebar, 72px instead of 240px. */
  readonly collapsed = input(false);
}
