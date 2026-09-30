import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChildren } from '@angular/core';
import { MatChip, MatChipAvatar, MatChipOption, MatChipRemove, MatChipSet } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { PbChip } from './chip';

/** A set of pb-chip children (PBChips). */
@Component({
  selector: 'pb-chips',
  imports: [MatChipSet, MatChip, MatChipOption, MatChipAvatar, MatChipRemove, MatIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chips.html',
  styleUrl: '../core/block.css',
})
export class PbChips {
  protected readonly chips = contentChildren(PbChip);
}
