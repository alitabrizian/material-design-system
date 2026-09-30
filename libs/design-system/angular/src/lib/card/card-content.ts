import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardContent } from '@angular/material/card';

/** Card body (PBCardContent). */
@Component({
  selector: 'pb-card-content',
  imports: [MatCardContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-content.html',
  styleUrl: '../core/block.css',
})
export class PbCardContent {}
