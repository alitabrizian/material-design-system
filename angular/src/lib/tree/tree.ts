import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTree, MatTreeNode, MatTreeNodeDef, MatTreeNodePadding, MatTreeNodeToggle } from '@angular/material/tree';

export interface PbTreeNode {
  label: string;
  icon?: string;
  children?: readonly PbTreeNode[];
}

/** Material 3 tree (PBTree) of nested PbTreeNode data. */
@Component({
  selector: 'pb-tree',
  imports: [MatTree, MatTreeNode, MatTreeNodeDef, MatTreeNodePadding, MatTreeNodeToggle, MatIconButton, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree.html',
  styleUrl: './tree.css',
})
export class PbTree {
  readonly nodes = input<readonly PbTreeNode[]>([]);

  protected readonly data = computed(() => [...this.nodes()]);
  protected readonly childrenAccessor = (node: PbTreeNode): PbTreeNode[] => [...(node.children ?? [])];

  protected hasChildren(node: PbTreeNode): boolean {
    return !!node.children?.length;
  }
}
