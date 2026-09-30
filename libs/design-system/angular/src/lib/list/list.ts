import { ChangeDetectionStrategy, Component, computed, contentChildren } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import {
  MatList,
  MatListItem,
  MatListItemAvatar,
  MatListItemIcon,
  MatListItemLine,
  MatListItemMeta,
  MatListItemTitle,
  MatNavList,
} from '@angular/material/list';
import { PbListItem } from './list-item';

/**
 * Material 3 list (PBList) of pb-list-item children; a nav list when any item has an href. The row
 * parts are written out in each branch (not shared through a template outlet) because mat-list-item
 * slots its icon, title, lines and meta by content projection, which only sees direct children.
 */
@Component({
  selector: 'pb-list',
  imports: [
    MatList,
    MatNavList,
    MatListItem,
    MatListItemTitle,
    MatListItemLine,
    MatListItemIcon,
    MatListItemAvatar,
    MatListItemMeta,
    MatIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class PbList {
  protected readonly items = contentChildren(PbListItem);
  protected readonly nav = computed(() => this.items().some((item) => item.href() !== undefined));
}
