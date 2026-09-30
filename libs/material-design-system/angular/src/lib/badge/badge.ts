import { Directive } from '@angular/core';
import { MatBadge } from '@angular/material/badge';

export type PbBadgeSize = 'small' | 'medium' | 'large';
export type PbBadgePosition = 'above after' | 'above before' | 'below after' | 'below before';

/**
 * Material 3 badge on any element (PBBadge). An empty pbBadge ("") with pbBadgeSize="small" is the
 * dot badge.
 *
 *   <pb-icon pbBadge="4">mail</pb-icon>
 */
@Directive({
  selector: '[pbBadge]',
  hostDirectives: [
    {
      directive: MatBadge,
      inputs: [
        'matBadge: pbBadge',
        'matBadgeSize: pbBadgeSize',
        'matBadgePosition: pbBadgePosition',
        'matBadgeOverlap: pbBadgeOverlap',
        'matBadgeHidden: pbBadgeHidden',
        'matBadgeDisabled: pbBadgeDisabled',
        'matBadgeDescription: pbBadgeDescription',
      ],
    },
  ],
})
export class PbBadge {}
