import { Directive, inject } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';

export type PbTooltipPosition = 'below' | 'above' | 'before' | 'after';

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
export class PbTooltip {
  constructor() {
    // Figma Motion: tooltips appear and disappear instantly. The class sets a 0s animation, which
    // MatTooltip takes as animations disabled (styles/material-motion.css).
    inject(MatTooltip).tooltipClass = 'pb-tooltip';
  }
}
