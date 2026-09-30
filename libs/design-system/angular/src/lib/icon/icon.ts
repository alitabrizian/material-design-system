import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/** icons = "Material Icons" (mat-icon's default), symbols = "Material Symbols Outlined". */
export type PbIconFontSet = 'icons' | 'symbols';
export type PbIconColor = 'inherit' | 'primary' | 'secondary' | 'tertiary' | 'error';

/**
 * Ligature icon from the self-hosted icon fonts in @partobita/design-tokens (PBIcon).
 *
 *   <pb-icon>home</pb-icon>
 *   <pb-icon fontSet="symbols" color="primary">settings</pb-icon>
 */
@Component({
  selector: 'pb-icon',
  imports: [MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pb-icon' },
  styles: `
    :host { display: inline-flex; }
    .pb-icon--primary { color: var(--mat-sys-primary); }
    .pb-icon--secondary { color: var(--mat-sys-secondary); }
    .pb-icon--tertiary { color: var(--mat-sys-tertiary); }
    .pb-icon--error { color: var(--mat-sys-error); }
  `,
  template: `<mat-icon [fontSet]="fontSetClass()" [class]="colorClass()" aria-hidden="true"><ng-content /></mat-icon>`,
})
export class PbIcon {
  readonly fontSet = input<PbIconFontSet>('icons');
  readonly color = input<PbIconColor>('inherit');

  protected readonly fontSetClass = computed(() =>
    this.fontSet() === 'symbols' ? 'material-symbols-outlined' : 'material-icons',
  );
  protected readonly colorClass = computed(() => (this.color() === 'inherit' ? '' : `pb-icon--${this.color()}`));
}
