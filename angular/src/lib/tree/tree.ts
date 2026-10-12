import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChild, Directive, input, output, TemplateRef } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTree, MatTreeNode, MatTreeNodeDef, MatTreeNodePadding, MatTreeNodeToggle } from '@angular/material/tree';

/** The default node shape of pb-tree. */
export interface PbTreeNode {
  label: string;
  icon?: string;
  children?: readonly PbTreeNode[];
}

/** `<ng-template pbTreeNode let-node>`: custom node content (after the toggle). */
@Directive({ selector: 'ng-template[pbTreeNode]' })
export class PbTreeNodeTemplate {
  constructor(readonly template: TemplateRef<{ $implicit: any }>) {}
}

/** A node was expanded or collapsed. */
export interface PbTreeExpandedEvent<N> {
  node: N;
  expanded: boolean;
}

/**
 * Material 3 tree (PBTree): nested data (each node's children, `childrenAccessor`) or flat data (nodes in
 * display order with a level, `levelAccessor`). Nodes with children get a toggle; `isExpandable` and
 * `(expandedChange)` load children on demand, with `isLoading` showing a progress bar under the node.
 */
@Component({
  selector: 'pb-tree',
  imports: [MatTree, MatTreeNode, MatTreeNodeDef, MatTreeNodePadding, MatTreeNodeToggle, MatIconButton, MatIcon, MatProgressBar, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree.html',
  styleUrl: './tree.css',
})
export class PbTree<N = PbTreeNode> {
  readonly nodes = input<readonly N[]>([]);
  /** Nested data: a node's children (default: its `children`). */
  readonly childrenAccessor = input<(node: N) => readonly N[] | null | undefined>();
  /** Flat data: a node's depth. Set it (instead of childrenAccessor) when nodes are a flat list. */
  readonly levelAccessor = input<(node: N) => number>();
  /** Whether a node has (or may load) children (default: it has children, or for flat data an `expandable` flag). */
  readonly isExpandable = input<(node: N) => boolean>();
  /** Shows a progress bar under a node while its children load. */
  readonly isLoading = input<(node: N) => boolean>();
  /** A node's text for the default content (default: its `label`). */
  readonly labelAccessor = input<(node: N) => string>();
  /** Identifies nodes across data changes, keeping them expanded (e.g. a name or an id). */
  readonly expansionKey = input<(node: N) => unknown>();
  /** Accessible name of the tree. */
  readonly label = input<string>();
  readonly expandedChange = output<PbTreeExpandedEvent<N>>();

  protected readonly nodeTemplate = contentChild(PbTreeNodeTemplate);

  protected readonly data = computed(() => [...this.nodes()]);

  private readonly children = computed(() => {
    const accessor = this.childrenAccessor();
    return (node: N): N[] => [...((accessor ? accessor(node) : (node as { children?: readonly N[] }).children) ?? [])];
  });

  /** Only one of childrenAccessor / levelAccessor may reach mat-tree. */
  protected readonly matChildrenAccessor = computed(() => (this.levelAccessor() ? undefined : this.children()));

  protected hasChildren(node: N): boolean {
    const custom = this.isExpandable();
    if (custom) return custom(node);
    if (this.levelAccessor()) return !!(node as { expandable?: boolean }).expandable;
    return this.children()(node).length > 0;
  }

  /** Flat data: a node shows only when every ancestor (the nearest node of each lower level above it) is expanded. */
  protected isVisible(node: N, tree: MatTree<N, unknown>): boolean {
    const level = this.levelAccessor();
    if (!level) return true;
    const nodes = this.data();
    let index = nodes.indexOf(node);
    let current = level(node);
    while (current > 0 && index > 0) {
      index--;
      const candidate = nodes[index];
      if (level(candidate) < current) {
        if (!tree.isExpanded(candidate)) return false;
        current = level(candidate);
      }
    }
    return true;
  }

  protected labelOf(node: N): string {
    const accessor = this.labelAccessor();
    return accessor ? accessor(node) : String((node as { label?: unknown }).label ?? '');
  }

  protected iconOf(node: N): string | undefined {
    return (node as { icon?: string }).icon;
  }
}
