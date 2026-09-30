import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';

export type PbSidenavMode = 'standard' | 'over';
export type PbSidenavPosition = 'start' | 'end';

/**
 * Side navigation drawer next to the main content (PBSidenav). The drawer holds the [pbSidenavPanel]
 * element; everything else is the main content.
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
})
export class PbSidenav {
  readonly mode = input<PbSidenavMode>('standard');
  readonly position = input<PbSidenavPosition>('start');
  readonly opened = model(true);
}
