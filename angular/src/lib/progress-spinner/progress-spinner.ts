import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

/** Circular progress indicator (PBProgressSpinner): indeterminate unless value (0-100) is set. */
@Component({
  selector: 'pb-progress-spinner',
  imports: [MatProgressSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: inline-block' },
  templateUrl: './progress-spinner.html',
})
export class PbProgressSpinner {
  readonly value = input<number>();
  readonly diameter = input(48);
  /** Defaults to a tenth of the diameter, like mat-progress-spinner. */
  readonly strokeWidth = input<number>();
}
