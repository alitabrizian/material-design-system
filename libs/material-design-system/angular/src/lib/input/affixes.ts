import { Directive } from '@angular/core';

/** Marks the element shown before the value in a pb-input (an icon or text). */
@Directive({ selector: '[pbPrefix]' })
export class PbPrefix {}

/** Marks the element shown after the value in a pb-input (an icon, text or icon button). */
@Directive({ selector: '[pbSuffix]' })
export class PbSuffix {}
