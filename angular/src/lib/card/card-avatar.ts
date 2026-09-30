import { Directive } from '@angular/core';
import { MatCardAvatar } from '@angular/material/card';

/**
 * The avatar in a pb-card-header (PBCardHeader's Avatar): a 40px circle, as mat-card-avatar.
 *
 *   <pb-card-header title="Shiba Inu"><img pbCardAvatar src="shiba.jpg" alt="" /></pb-card-header>
 */
@Directive({
  selector: '[pbCardAvatar]',
  hostDirectives: [MatCardAvatar],
})
export class PbCardAvatar {}
