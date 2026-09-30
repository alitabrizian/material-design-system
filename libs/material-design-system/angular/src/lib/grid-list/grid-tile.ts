import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PbContentTemplate } from '../core/content-template';

/** One tile of a pb-grid-list (PBGridTile). */
@Component({
  selector: 'pb-grid-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: '../core/content-template.html',
})
export class PbGridTile extends PbContentTemplate {
  readonly colspan = input(1);
  readonly rowspan = input(1);
}
