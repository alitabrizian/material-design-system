import { Directive } from '@angular/core';
import { MatBadge } from '@angular/material/badge';
import { MatRipple } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';

export type PbBadgeSize = 'small' | 'medium' | 'large';
export type PbBadgePosition = 'above after' | 'above before' | 'below after' | 'below before';
export type PbTooltipPosition = 'below' | 'above' | 'before' | 'after';

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

/**
 * Material 3 plain tooltip on any element (PBTooltip).
 *
 *   <pb-button variant="icon" icon="delete" pbTooltip="Delete" pbTooltipPosition="above" />
 */
@Directive({
  selector: '[pbTooltip]',
  hostDirectives: [
    {
      directive: MatTooltip,
      inputs: [
        'matTooltip: pbTooltip',
        'matTooltipPosition: pbTooltipPosition',
        'matTooltipDisabled: pbTooltipDisabled',
        'matTooltipShowDelay: pbTooltipShowDelay',
        'matTooltipHideDelay: pbTooltipHideDelay',
      ],
    },
  ],
})
export class PbTooltip {}

/**
 * Material ripple on any element (PBRipples). The host needs position: relative and overflow: hidden
 * (or pbRippleUnbounded).
 */
@Directive({
  selector: '[pbRipple]',
  host: { class: 'mat-ripple' },
  hostDirectives: [
    {
      directive: MatRipple,
      inputs: [
        'matRippleCentered: pbRippleCentered',
        'matRippleUnbounded: pbRippleUnbounded',
        'matRippleDisabled: pbRippleDisabled',
        'matRippleColor: pbRippleColor',
      ],
    },
  ],
})
export class PbRipple {}
