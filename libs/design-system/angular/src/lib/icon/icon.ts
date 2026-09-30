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
  templateUrl: './icon.html',
  styleUrl: './icon.css',
})
export class PbIcon {
  readonly fontSet = input<PbIconFontSet>('icons');
  readonly color = input<PbIconColor>('inherit');

  protected readonly fontSetClass = computed(() =>
    this.fontSet() === 'symbols' ? 'material-symbols-outlined' : 'material-icons',
  );
  protected readonly colorClass = computed(() => (this.color() === 'inherit' ? '' : `pb-icon--${this.color()}`));
}
