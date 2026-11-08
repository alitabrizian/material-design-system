import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/**
 * icons = "Material Icons" (mat-icon's default), symbols = "Material Symbols Outlined",
 * partobita = "PartoBita Icons": the design system's own icon set (the Icons page) as a font.
 */
export type PbIconFontSet = 'icons' | 'symbols' | 'partobita';

const FONT_SET_CLASSES: Record<PbIconFontSet, string> = {
  icons: 'material-icons',
  symbols: 'material-symbols-outlined',
  partobita: 'pb-icons',
};
export type PbIconColor = 'inherit' | 'primary' | 'secondary' | 'tertiary' | 'error';

/**
 * Ligature icon from the self-hosted icon fonts in @partobita/design-tokens (PBIcon).
 *
 *   <pb-icon>home</pb-icon>
 *   <pb-icon fontSet="symbols" color="primary">settings</pb-icon>
 *   <pb-icon fontSet="partobita">home-line</pb-icon>
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

  protected readonly fontSetClass = computed(() => FONT_SET_CLASSES[this.fontSet()]);
  protected readonly colorClass = computed(() => (this.color() === 'inherit' ? '' : `pb-icon--${this.color()}`));
}
