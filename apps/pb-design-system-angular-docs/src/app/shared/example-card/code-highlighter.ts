/**
 * Minimal regex-based token coloring for the example code views, the TypeScript twin of the Blazor
 * docs' CodeHighlighter (same tok-* classes, styled by app.css). An approximation, not a parser.
 */

export type CodeLanguage = 'html' | 'ts';

const TS_KEYWORDS = [
  'import', 'from', 'export', 'const', 'let', 'readonly', 'protected', 'private', 'public', 'class',
  'interface', 'type', 'extends', 'implements', 'new', 'return', 'if', 'else', 'for', 'of', 'in',
  'true', 'false', 'null', 'undefined', 'this', 'as', 'void', 'string', 'number', 'boolean',
];

const PATTERNS: Record<CodeLanguage, RegExp> = {
  html: /(?<comment><!--[\s\S]*?-->)|(?<string>"[^"]*")|(?<tag><\/?[A-Za-z][\w:-]*)|(?<razor>@(?:if|else|for|switch|case|default|empty)\b|\{\{[^}]*\}\})/g,
  ts: new RegExp(
    String.raw`(?<comment>\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(?<string>'[^'\n]*'|"[^"\n]*"|` +
      '`[^`]*`' +
      String.raw`)|(?<keyword>\b(?:${TS_KEYWORDS.join('|')})\b)`,
    'g',
  ),
};

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Returns HTML with tok-* spans around comments, strings, tags, template syntax and keywords. */
export function highlight(code: string, language: CodeLanguage): string {
  let html = '';
  let last = 0;
  for (const match of code.matchAll(PATTERNS[language])) {
    const index = match.index ?? 0;
    html += escapeHtml(code.slice(last, index));
    const kind = Object.entries(match.groups ?? {}).find(([, value]) => value !== undefined)?.[0] ?? 'plain';
    html += `<span class="tok-${kind}">${escapeHtml(match[0])}</span>`;
    last = index + match[0].length;
  }
  return html + escapeHtml(code.slice(last));
}
