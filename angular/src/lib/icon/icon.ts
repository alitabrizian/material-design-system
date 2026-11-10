import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/**
 * partobita = "PartoBita Icons" (the default): the design system's own icon set (the Icons page) as a font.
 * icons = "Material Icons" and symbols = "Material Symbols Outlined" are kept for compatibility.
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
 *   <pb-icon>home-line</pb-icon>
 *   <pb-icon color="primary">settings-01</pb-icon>
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
  readonly fontSet = input<PbIconFontSet>('partobita');
  readonly color = input<PbIconColor>('inherit');

  protected readonly fontSetClass = computed(() => FONT_SET_CLASSES[this.fontSet()]);
  protected readonly colorClass = computed(() => (this.color() === 'inherit' ? '' : `pb-icon--${this.color()}`));
}
