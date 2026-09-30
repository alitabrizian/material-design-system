import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChildren, input } from '@angular/core';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { PbGridTile } from './grid-tile';

/** Two-dimensional grid of pb-grid-tile children (PBGridList). */
@Component({
  selector: 'pb-grid-list',
  imports: [MatGridList, MatGridTile, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grid-list.html',
  styleUrl: '../core/block.css',
})
export class PbGridList {
  readonly cols = input(2);
  /** A fixed height ("100px"), a ratio ("4:3") or "fit". */
  readonly rowHeight = input('1:1');
  readonly gutter = input('1px');

  protected readonly tiles = contentChildren(PbGridTile);
}
