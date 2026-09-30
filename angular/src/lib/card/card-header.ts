import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';

/** Card header (PBCardHeader): title, optional subtitle, and an optional [pbCardAvatar] element. */
@Component({
  selector: 'pb-card-header',
  imports: [MatCardHeader, MatCardTitle, MatCardSubtitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-header.html',
  styleUrl: '../core/block.css',
})
export class PbCardHeader {
  readonly title = input<string>();
  readonly subtitle = input<string>();
}
