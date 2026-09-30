import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatCard, MatCardAppearance } from '@angular/material/card';

export type PbCardVariant = 'elevated' | 'filled' | 'outlined';

/**
 * Material 3 card (PBCard). Compose with pb-card-header, pb-card-content and pb-card-actions, or any
 * content (images, lists).
 */
@Component({
  selector: 'pb-card',
  imports: [MatCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card.html',
  styleUrl: '../core/block.css',
})
export class PbCard {
  readonly variant = input<PbCardVariant>('elevated');

  protected readonly appearance = computed<MatCardAppearance>(() => {
    const variant = this.variant();
    return variant === 'elevated' ? 'raised' : variant;
  });
}
