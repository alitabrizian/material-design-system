import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import {
  MatExpansionPanel,
  MatExpansionPanelActionRow,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';

/**
 * Material expansion panel (PBExpansionPanel). The content is the body; [pbPanelActions] elements go
 * in the action row, shown with hasActions.
 */
@Component({
  selector: 'pb-expansion-panel',
  imports: [
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    MatExpansionPanelActionRow,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './expansion-panel.html',
  styleUrl: '../core/block.css',
})
export class PbExpansionPanel {
  readonly title = input('');
  readonly description = input<string>();
  readonly expanded = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly hideToggle = input(false, { transform: booleanAttribute });
  /** Shows the action row that holds the [pbPanelActions] content. */
  readonly hasActions = input(false, { transform: booleanAttribute });
}
