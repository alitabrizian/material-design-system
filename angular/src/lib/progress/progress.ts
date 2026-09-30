import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

/**
 * Linear progress indicator (PBProgressBar): determinate from value (0-100), indeterminate, or
 * buffer when bufferValue is set.
 */
@Component({
  selector: 'pb-progress-bar',
  imports: [MatProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `<mat-progress-bar [mode]="mode()" [value]="value()" [bufferValue]="bufferValue() ?? 0" />`,
})
export class PbProgressBar {
  readonly value = input(0);
  readonly indeterminate = input(false, { transform: booleanAttribute });
  readonly bufferValue = input<number>();

  protected readonly mode = computed(() =>
    this.indeterminate() ? 'indeterminate' : this.bufferValue() === undefined ? 'determinate' : 'buffer',
  );
}

/** Circular progress indicator (PBProgressSpinner): indeterminate unless value (0-100) is set. */
@Component({
  selector: 'pb-progress-spinner',
  imports: [MatProgressSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: inline-block; }',
  template: `
    <mat-progress-spinner
      [mode]="value() === undefined ? 'indeterminate' : 'determinate'"
      [value]="value() ?? 0"
      [diameter]="diameter()"
      [strokeWidth]="strokeWidth() ?? diameter() / 10"
    />
  `,
})
export class PbProgressSpinner {
  readonly value = input<number>();
  readonly diameter = input(48);
  readonly strokeWidth = input<number>();
}
