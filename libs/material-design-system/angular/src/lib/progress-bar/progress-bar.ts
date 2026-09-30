import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';

/**
 * Linear progress indicator (PBProgressBar): determinate from value (0-100), indeterminate, or
 * buffer when bufferValue is set.
 */
@Component({
  selector: 'pb-progress-bar',
  imports: [MatProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress-bar.html',
  styleUrl: '../core/block.css',
})
export class PbProgressBar {
  readonly value = input(0);
  readonly indeterminate = input(false, { transform: booleanAttribute });
  readonly bufferValue = input<number>();

  protected readonly mode = computed(() =>
    this.indeterminate() ? 'indeterminate' : this.bufferValue() === undefined ? 'determinate' : 'buffer',
  );
}
