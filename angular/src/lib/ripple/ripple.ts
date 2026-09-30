import { Directive } from '@angular/core';
import { MatRipple } from '@angular/material/core';

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
