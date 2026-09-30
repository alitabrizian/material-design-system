import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, contentChildren, input, model } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { PbTab } from './tab';

export type PbTabsAlign = 'start' | 'center' | 'end';

/** Material 3 primary tabs (PBTabs) of pb-tab children. */
@Component({
  selector: 'pb-tabs',
  imports: [MatTabGroup, MatTab, MatTabLabel, MatIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
})
export class PbTabs {
  readonly selectedIndex = model(0);
  /** Stretches the tabs across the full width of the header. */
  readonly stretch = input(true, { transform: booleanAttribute });
  readonly align = input<PbTabsAlign>('start');

  protected readonly tabs = contentChildren(PbTab);
}
