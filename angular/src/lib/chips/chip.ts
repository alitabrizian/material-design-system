import { booleanAttribute, ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { PbContentTemplate } from '../core/content-template';

export type PbChipVariant = 'assist' | 'filter' | 'input';

/**
 * One chip of a pb-chips (PBChip). assist = action chip ((chipClick)), filter = toggleable
 * ([(selected)]), input = removable entry ((removed)). The content is the label.
 */
@Component({
  selector: 'pb-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: '../core/content-template.html',
})
export class PbChip extends PbContentTemplate {
  readonly variant = input<PbChipVariant>('assist');
  readonly icon = input<string>();
  /** A leading 24px round image (matChipAvatar), e.g. a person photo. */
  readonly avatar = input<string>();
  /** Alternative text of the avatar image (empty: decorative). */
  readonly avatarAlt = input('');
  readonly selected = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly highlighted = input(false, { transform: booleanAttribute });
  readonly removed = output<void>();
  readonly chipClick = output<MouseEvent>();
}
