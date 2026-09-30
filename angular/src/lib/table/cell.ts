import { Directive, inject, input, TemplateRef } from '@angular/core';

/** Custom cell template for one pb-table column: <ng-template pbCell="price" let-row>...</ng-template> */
@Directive({ selector: 'ng-template[pbCell]' })
export class PbCell {
  readonly key = input.required<string>({ alias: 'pbCell' });
  readonly template = inject(TemplateRef);
}
