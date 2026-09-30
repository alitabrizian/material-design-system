import { Directive } from '@angular/core';
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
export class PbTooltip {}
