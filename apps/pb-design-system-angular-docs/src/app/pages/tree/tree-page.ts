import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PbTree, PbTreeNode } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-tree-page',
  imports: [PageHeader, ExampleCard, PbTree],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree-page.html',
})
export class TreePage {
  // #region nested
  protected readonly food: PbTreeNode[] = [
    { label: 'Fruit', children: [{ label: 'Apple' }, { label: 'Banana' }, { label: 'Fruit loops' }] },
    {
      label: 'Vegetables',
      children: [
        { label: 'Green', children: [{ label: 'Broccoli' }, { label: 'Brussels sprouts' }] },
        { label: 'Orange', children: [{ label: 'Pumpkins' }, { label: 'Carrots' }] },
      ],
    },
  ];
  // #endregion

  // #region icons
  protected readonly files: PbTreeNode[] = [
    {
      label: 'src',
      icon: 'folder',
      children: [
        { label: 'app', icon: 'folder', children: [{ label: 'app.ts', icon: 'description' }] },
        { label: 'main.ts', icon: 'description' },
      ],
    },
    { label: 'package.json', icon: 'data_object' },
  ];
  // #endregion
}
