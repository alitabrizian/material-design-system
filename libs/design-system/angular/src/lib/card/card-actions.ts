import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardActions } from '@angular/material/card';

export type PbCardActionsAlign = 'start' | 'end';

/** Card action row (PBCardActions). */
@Component({
  selector: 'pb-card-actions',
  imports: [MatCardActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-actions.html',
  styleUrl: '../core/block.css',
})
export class PbCardActions {
  readonly align = input<PbCardActionsAlign>('start');
}
