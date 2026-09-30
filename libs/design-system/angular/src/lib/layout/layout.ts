import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  input,
  model,
} from '@angular/core';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatToolbar } from '@angular/material/toolbar';
import { PB_CONTENT_TEMPLATE, PbContentTemplate } from '../core/content-template';

/** Material 3 top app bar row (PBToolbar). */
@Component({
  selector: 'pb-toolbar',
  imports: [MatToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `<mat-toolbar><ng-content /></mat-toolbar>`,
})
export class PbToolbar {}

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
  styles: ':host { display: block; } mat-sidenav-container { height: 100%; }',
  template: `
    <mat-sidenav-container>
      <mat-sidenav [mode]="mode() === 'over' ? 'over' : 'side'" [position]="position()" [(opened)]="opened">
        <ng-content select="[pbSidenavPanel]" />
      </mat-sidenav>
      <mat-sidenav-content><ng-content /></mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class PbSidenav {
  readonly mode = input<PbSidenavMode>('standard');
  readonly position = input<PbSidenavPosition>('start');
  readonly opened = model(true);
}

/** One tile of a pb-grid-list (PBGridTile). */
@Component({
  selector: 'pb-grid-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PB_CONTENT_TEMPLATE,
})
export class PbGridTile extends PbContentTemplate {
  readonly colspan = input(1);
  readonly rowspan = input(1);
}

/** Two-dimensional grid of pb-grid-tile children (PBGridList). */
@Component({
  selector: 'pb-grid-list',
  imports: [MatGridList, MatGridTile, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `
    <mat-grid-list [cols]="cols()" [rowHeight]="rowHeight()" [gutterSize]="gutter()">
      @for (tile of tiles(); track tile) {
        <mat-grid-tile [colspan]="tile.colspan()" [rowspan]="tile.rowspan()">
          <ng-container [ngTemplateOutlet]="tile.template()" />
        </mat-grid-tile>
      }
    </mat-grid-list>
  `,
})
export class PbGridList {
  readonly cols = input(2);
  /** A fixed height ("100px"), a ratio ("4:3") or "fit". */
  readonly rowHeight = input('1:1');
  readonly gutter = input('1px');

  protected readonly tiles = contentChildren(PbGridTile);
}
