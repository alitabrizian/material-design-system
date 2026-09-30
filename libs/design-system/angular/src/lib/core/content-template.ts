import { Directive, TemplateRef, viewChild } from '@angular/core';

/**
 * Base for child components (pb-option, pb-tab, pb-step, ...) whose only job is to hold content.
 * Angular Material containers find their children with content queries, which cannot see through a
 * wrapper's <ng-content>, so each PB container collects its PB children instead and renders the
 * matching mat-* child itself, stamping this template inside it.
 *
 * Subclasses use templateUrl '../core/content-template.html'.
 */
@Directive()
export abstract class PbContentTemplate {
  readonly template = viewChild.required(TemplateRef);
}
