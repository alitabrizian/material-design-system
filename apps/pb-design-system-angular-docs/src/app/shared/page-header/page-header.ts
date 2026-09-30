import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A docs page's title and intro paragraph (the content). */
@Component({
  selector: 'docs-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.html',
})
export class PageHeader {
  readonly title = input.required<string>();
}
