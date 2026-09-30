import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatDivider } from '@angular/material/divider';

/** Material 3 divider (PBDivider). */
@Component({
  selector: 'pb-divider',
  imports: [MatDivider],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: contents; }',
  template: `<mat-divider [vertical]="vertical()" [inset]="inset()" />`,
})
export class PbDivider {
  readonly vertical = input(false, { transform: booleanAttribute });
  readonly inset = input(false, { transform: booleanAttribute });
}
