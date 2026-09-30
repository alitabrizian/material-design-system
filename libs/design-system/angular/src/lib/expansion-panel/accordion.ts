import { Directive } from '@angular/core';
import { MatAccordion } from '@angular/material/expansion';

/** Groups pb-expansion-panel children so that only one is open at a time, unless multi (PBAccordion). */
@Directive({
  selector: 'pb-accordion',
  host: { style: 'display: block' },
  hostDirectives: [{ directive: MatAccordion, inputs: ['multi', 'hideToggle', 'displayMode', 'togglePosition'] }],
})
export class PbAccordion {}
