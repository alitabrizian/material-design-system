import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';

/** Material 3 top app bar row (PBToolbar). */
@Component({
  selector: 'pb-toolbar',
  imports: [MatToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toolbar.html',
  styleUrl: '../core/block.css',
})
export class PbToolbar {}
