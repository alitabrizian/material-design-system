import { ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PAGE_SOURCES } from '../../generated/page-sources';
import { CodeLanguage, highlight } from './code-highlighter';

/**
 * One live example with a "show code" view, like the Blazor docs' ExampleCard. The code is not a copy:
 * the .html tab is this element's own content, cut from the page's .html file, and the .ts tab is the
 * page's `// #region <id>` block, both read from the generated page sources.
 *
 *   <docs-example title="Button overview" page="button" id="button-overview">...</docs-example>
 */
@Component({
  selector: 'docs-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.id]': 'null' },
  templateUrl: './example-card.html',
})
export class ExampleCard {
  readonly title = input.required<string>();
  /** The page folder under pages/ whose source holds this example. */
  readonly page = input.required<string>();
  readonly id = input.required<string>();

  protected readonly showCode = signal(false);
  protected readonly tab = signal<CodeLanguage>('html');

  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly code = computed(() => {
    const source = PAGE_SOURCES[this.page()] ?? { html: '', ts: '' };
    return { html: exampleMarkup(source.html, this.id()), ts: tsRegion(source.ts, this.id()) };
  });

  protected readonly activeCode = computed(() => this.code()[this.tab()]);

  protected readonly highlighted = computed<SafeHtml>(() =>
    // Safe: highlight() escapes the whole source and only adds its own tok-* spans.
    this.sanitizer.bypassSecurityTrustHtml(highlight(this.activeCode(), this.tab())),
  );

  private exampleUrl(): string {
    return this.document.location.href.split('#')[0] + '#' + this.id();
  }

  protected copyLink(): void {
    void navigator.clipboard.writeText(this.exampleUrl());
  }

  protected copyCode(): void {
    void navigator.clipboard.writeText(this.activeCode());
  }

  protected openInNew(): void {
    this.document.defaultView?.open(this.exampleUrl(), '_blank');
  }
}

/** The content of the <docs-example ... id="<id>"> element in a page's .html, dedented. */
function exampleMarkup(html: string, id: string): string {
  const attr = html.indexOf(`id="${id}"`);
  if (attr < 0) return '';
  const start = html.indexOf('>', attr) + 1;
  const end = html.indexOf('</docs-example>', start);
  return dedent(html.slice(start, end < 0 ? undefined : end));
}

/** The lines between `// #region <id>` and the next `// #endregion` in a page's .ts, dedented. */
function tsRegion(ts: string, id: string): string {
  const marker = `// #region ${id}\n`;
  const start = ts.indexOf(marker);
  if (start < 0) return '';
  const end = ts.indexOf('// #endregion', start);
  return dedent(ts.slice(start + marker.length, end < 0 ? undefined : end));
}

function dedent(text: string): string {
  const lines = text.replace(/^\s*\n|\s+$/g, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)?.[0].length ?? 0));
  return lines.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join('\n');
}
