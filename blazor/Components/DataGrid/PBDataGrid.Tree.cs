using System.Collections;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// Tree mode (<see cref="PBTreeList{TItem}"/>): the data is a hierarchy, flat (key and parent key fields) or
/// nested (a children field), optionally loaded on demand. The grid shows the expanded branches, sorts
/// siblings, filters with the matches' ancestors, and draws an expand button in the tree column.
/// Everything else (editing, filtering UI, summaries, selection, paging, export...) is the grid's own.
/// </summary>
public partial class PBDataGrid<TItem>
{
    /// <summary>Tree settings; null for a plain grid (PBTreeList overrides this).</summary>
    private protected virtual GridTreeConfig<TItem>? TreeConfig => null;

    private sealed class TreeNode
    {
        public required TItem Item { get; init; }
        public required object Key { get; init; }
        public TreeNode? Parent { get; set; }
        public List<TreeNode> Children { get; } = [];
        public int Level { get; set; }

        /// <summary>Has children that are not loaded yet (HasChildrenFieldName, load on demand).</summary>
        public bool MayHaveChildren { get; set; }
        public bool Visible { get; set; }
        public bool Matches { get; set; }
    }

    private readonly Dictionary<object, bool> treeExpanded = [];
    private readonly Dictionary<object, List<TItem>> treeLoadedChildren = [];
    private readonly HashSet<object> treeLoading = [];
    private Dictionary<object, TreeNode> treeNodes = [];
    private List<TreeNode> treeRoots = [];
    private bool? treeExpandAll;
    private bool treeFiltered;
    private TItem? newRowParent;

    private bool IsTree => TreeConfig is not null;

    // ------------------------------------------------------------------------------ building

    private void BuildTree(GridTreeConfig<TItem> tree, PBGridFilter? filter, List<(PBDataGridColumn Column, bool Descending, bool Group)> sortKeys)
    {
        serverMode = false;
        filteredQuery = null;
        BuildTreeNodes(tree);

        treeFiltered = filter is not null;
        foreach (var node in treeNodes.Values) node.Matches = filter is null || (node.Item is not null && filter.Matches(node.Item, this));
        if (filter is null)
        {
            foreach (var node in treeNodes.Values) node.Visible = true;
        }
        else
        {
            foreach (var root in treeRoots) MarkVisible(root, tree.FilterTreeMode, ancestorMatches: false);
        }

        var keys = sortKeys.Where(k => !k.Group).ToList();
        var visibleRoots = tree.FilterTreeMode == PBTreeListFilterTreeMode.Matches && treeFiltered
            ? MatchRoots().ToList()
            : treeRoots.Where(n => n.Visible).ToList();

        var ordered = new List<TItem>();
        foreach (var root in SortNodes(visibleRoots, keys)) EmitNode(root, 0, keys, ordered);

        filteredItems = ordered;
        totalCount = ordered.Count;
        rowCount = allRows.Count;
        ClampPage();
        pageRows = PagingActive ? allRows.Skip(pageIndex * pageSize).Take(pageSize).ToList() : allRows;
        totalSummaryValues = TotalSummaryDefs().Select(d => Summary(d, ordered, null, inGroupRow: false)).ToList();
    }

    private void BuildTreeNodes(GridTreeConfig<TItem> tree)
    {
        treeNodes = [];
        treeRoots = [];
        var source = (Data ?? []).Concat(batchInserted).Where(i => i is not null).ToList();

        if (tree.ChildrenFieldName is not null || tree.LoadChildren is not null && tree.ParentKeyFieldName is null)
        {
            foreach (var item in source.Where(i => !batchInserted.Contains(i))) treeRoots.Add(AddNested(tree, item, null, 0));
            // Batch-mode rows without a parent are new root nodes.
            foreach (var inserted in batchInserted.Where(i => !newRowParents.ContainsKey(i!)))
            {
                var node = new TreeNode { Item = inserted, Key = KeyOf(inserted) };
                if (treeNodes.TryAdd(node.Key, node)) treeRoots.Add(node);
            }
        }
        else
        {
            foreach (var item in source)
            {
                var key = KeyOf(item);
                treeNodes.TryAdd(key, new TreeNode { Item = item, Key = key });
            }
            foreach (var node in treeNodes.Values)
            {
                var parentKey = tree.ParentKeyFieldName is null ? null : GridField.GetValue(node.Item!, tree.ParentKeyFieldName);
                if (parentKey is not null && !Equals(parentKey, tree.RootValue) && !Equals(parentKey, node.Key)
                    && treeNodes.TryGetValue(parentKey, out var parent) && !IsAncestor(node, parent))
                {
                    node.Parent = parent;
                    parent.Children.Add(node);
                }
            }
            foreach (var node in treeNodes.Values.Where(n => n.Parent is null)) treeRoots.Add(node);
            foreach (var root in treeRoots) SetLevels(root, 0);
            // Children loaded on demand for flat data are added like nested children.
            foreach (var (parentKey, children) in treeLoadedChildren)
            {
                if (!treeNodes.TryGetValue(parentKey, out var parent)) continue;
                foreach (var child in children.Where(c => !treeNodes.ContainsKey(KeyOf(c)))) parent.Children.Add(AddNested(tree, child, parent, parent.Level + 1));
            }
        }

        foreach (var node in treeNodes.Values)
        {
            node.MayHaveChildren = node.Children.Count == 0 && tree.HasChildrenFieldName is not null
                && GridField.GetValue(node.Item!, tree.HasChildrenFieldName) is true && !treeLoadedChildren.ContainsKey(node.Key);
        }
    }

    private TreeNode AddNested(GridTreeConfig<TItem> tree, TItem item, TreeNode? parent, int level)
    {
        var key = KeyOf(item);
        var node = new TreeNode { Item = item, Key = key, Parent = parent, Level = level };
        if (!treeNodes.TryAdd(key, node)) return treeNodes[key];
        IEnumerable<TItem>? children = null;
        if (tree.ChildrenFieldName is not null && GridField.GetValue(item!, tree.ChildrenFieldName) is IEnumerable nested)
            children = nested.OfType<TItem>();
        if (treeLoadedChildren.TryGetValue(key, out var loaded)) children = (children ?? []).Concat(loaded);
        foreach (var child in children ?? [])
        {
            if (child is null || treeNodes.ContainsKey(KeyOf(child))) continue;
            node.Children.Add(AddNested(tree, child, node, level + 1));
        }
        // Batch-mode rows added under this node.
        foreach (var inserted in batchInserted.Where(i => newRowParents.TryGetValue(i!, out var p) && Equals(p, key)))
        {
            var child = new TreeNode { Item = inserted, Key = KeyOf(inserted), Parent = node, Level = level + 1 };
            if (treeNodes.TryAdd(child.Key, child)) node.Children.Add(child);
        }
        return node;
    }

    private static bool IsAncestor(TreeNode candidate, TreeNode node)
    {
        for (var current = node; current is not null; current = current.Parent)
        {
            if (ReferenceEquals(current, candidate)) return true;
        }
        return false;
    }

    private static void SetLevels(TreeNode node, int level)
    {
        node.Level = level;
        foreach (var child in node.Children) SetLevels(child, level + 1);
    }

    /// <summary>Marks the nodes shown by the filter mode; returns whether the subtree has a match.</summary>
    private static bool MarkVisible(TreeNode node, PBTreeListFilterTreeMode mode, bool ancestorMatches)
    {
        var below = false;
        foreach (var child in node.Children)
        {
            below |= MarkVisible(child, mode, ancestorMatches || node.Matches);
        }
        node.Visible = mode switch
        {
            PBTreeListFilterTreeMode.EntireBranch => node.Matches || below || ancestorMatches,
            PBTreeListFilterTreeMode.Matches => node.Matches,
            _ => node.Matches || below,
        };
        return node.Matches || below;
    }

    /// <summary>Matches mode: matching nodes whose nearest matching ancestor is none become roots.</summary>
    private IEnumerable<TreeNode> MatchRoots()
    {
        foreach (var node in treeNodes.Values)
        {
            if (!node.Matches) continue;
            var parent = node.Parent;
            while (parent is not null && !parent.Matches) parent = parent.Parent;
            if (parent is null) yield return node;
        }
    }

    private IEnumerable<TreeNode> SortNodes(IEnumerable<TreeNode> nodes, List<(PBDataGridColumn Column, bool Descending, bool Group)> keys)
    {
        var list = nodes.ToList();
        if (keys.Count == 0) return list;
        var byItem = list.ToDictionary(n => (object)n.Item!, n => n, ReferenceEqualityComparer.Instance);
        return Sort(list.Select(n => n.Item), keys).Select(i => byItem[i!]).ToList();
    }

    private List<TreeNode> ShownChildren(TreeNode node)
    {
        var mode = TreeConfig!.FilterTreeMode;
        if (!treeFiltered) return node.Children;
        if (mode != PBTreeListFilterTreeMode.Matches) return node.Children.Where(c => c.Visible).ToList();
        // Matches mode: the nearest matching descendants of each branch.
        var result = new List<TreeNode>();
        void Collect(TreeNode n)
        {
            foreach (var child in n.Children)
            {
                if (child.Matches) result.Add(child);
                else Collect(child);
            }
        }
        Collect(node);
        return result;
    }

    private void EmitNode(TreeNode node, int level, List<(PBDataGridColumn Column, bool Descending, bool Group)> keys, List<TItem> ordered)
    {
        ordered.Add(node.Item);
        var children = ShownChildren(node);
        var hasChildren = children.Count > 0 || (node.MayHaveChildren && !treeFiltered);
        var expanded = hasChildren && IsNodeExpanded(node.Key, children.Count > 0);
        AddTreeRow(node.Item, level, node, inserted: batchInserted.Contains(node.Item), hasChildren, expanded);
        if (expanded)
        {
            foreach (var child in SortNodes(children, keys)) EmitNode(child, level + 1, keys, ordered);
        }
        else
        {
            // Collapsed: still part of the filtered set (summaries, select all, export).
            foreach (var child in children) CollectHidden(child, ordered);
        }
    }

    private void CollectHidden(TreeNode node, List<TItem> ordered)
    {
        ordered.Add(node.Item);
        foreach (var child in ShownChildren(node)) CollectHidden(child, ordered);
    }

    private void AddTreeRow(TItem item, int level, TreeNode? node, bool inserted, bool hasChildren = false, bool expanded = false)
    {
        allRows.Add(new GridRow
        {
            Kind = GridRowKind.Data,
            Item = item,
            Level = 0,
            Index = allRows.Count,
            DataIndex = dataRowCounter++,
            IsInserted = inserted,
            TreeLevel = level,
            TreeHasChildren = hasChildren,
            TreeExpanded = expanded,
            TreeLoading = node is not null && treeLoading.Contains(node.Key),
        });
    }

    private bool IsNodeExpanded(object key, bool childrenKnown)
    {
        if (treeExpanded.TryGetValue(key, out var expanded)) return expanded;
        if (treeFiltered && childrenKnown) return true;
        return treeExpandAll ?? TreeConfig!.AutoExpandAllNodes;
    }

    // ------------------------------------------------------------------------------ expanding

    /// <summary>Tree mode: whether the item's node is expanded.</summary>
    public bool IsRowExpanded(TItem item)
    {
        EnsureData();
        return allRows.Any(r => r.Kind == GridRowKind.Data && r.TreeExpanded && Equals(KeyOf(r.Item!), KeyOf(item)));
    }

    /// <summary>Tree mode: expands the item's node (loading its children on demand).</summary>
    public Task ExpandRowAsync(TItem item) => SetNodeExpandedAsync(item, true);

    /// <summary>Tree mode: collapses the item's node.</summary>
    public Task CollapseRowAsync(TItem item) => SetNodeExpandedAsync(item, false);

    /// <summary>Tree mode: expands every node (nodes loaded on demand stay collapsed).</summary>
    public void ExpandAllRows()
    {
        treeExpanded.Clear();
        treeExpandAll = true;
        Invalidate();
    }

    /// <summary>Tree mode: collapses every node.</summary>
    public void CollapseAllRows()
    {
        treeExpanded.Clear();
        treeExpandAll = false;
        Invalidate();
    }

    private Task ToggleTreeRowAsync(GridRow row) => SetNodeExpandedAsync(row.Item!, !row.TreeExpanded);

    private async Task SetNodeExpandedAsync(TItem item, bool expanded)
    {
        var tree = TreeConfig;
        if (tree is null || item is null) return;
        var key = KeyOf(item);
        treeExpanded[key] = expanded;
        Invalidate();
        if (tree.NodeExpandedChanged is not null) await tree.NodeExpandedChanged(new PBTreeListNodeExpandedEventArgs<TItem>(item, expanded));
        if (!expanded || tree.LoadChildren is null || treeLoadedChildren.ContainsKey(key) || treeLoading.Contains(key)) return;
        if (treeNodes.TryGetValue(key, out var node) && node.Children.Count > 0 && !node.MayHaveChildren) return;

        treeLoading.Add(key);
        Invalidate();
        try
        {
            var args = new PBTreeListChildrenLoadingEventArgs<TItem>(item, CancellationToken.None);
            await tree.LoadChildren(args);
            treeLoadedChildren[key] = [.. args.Children ?? []];
        }
        finally
        {
            treeLoading.Remove(key);
            Invalidate();
        }
    }

    // ------------------------------------------------------------------------------ hierarchy helpers

    /// <summary>Tree mode: the item's parent item (default for root nodes).</summary>
    public TItem? GetParentDataItem(TItem item)
    {
        EnsureData();
        return treeNodes.TryGetValue(KeyOf(item), out var node) && node.Parent is not null ? node.Parent.Item : default;
    }

    /// <summary>Tree mode: the item's children (loaded ones, unfiltered).</summary>
    public IReadOnlyList<TItem> GetChildDataItems(TItem item)
    {
        EnsureData();
        return treeNodes.TryGetValue(KeyOf(item), out var node) ? node.Children.Select(c => c.Item).ToList() : [];
    }

    private TreeNode? ParentOf(TItem item) =>
        newRowParents.TryGetValue(item!, out var key) && treeNodes.TryGetValue(key, out var parent) ? parent : null;

    private IEnumerable<TreeNode> Descendants(TreeNode node)
    {
        foreach (var child in node.Children)
        {
            yield return child;
            foreach (var below in Descendants(child)) yield return below;
        }
    }

    /// <summary>The cell of this column draws the tree's indent and expand button.</summary>
    private bool IsTreeColumn(PBDataGridColumn column) =>
        IsTree && column == (TreeConfig!.TreeColumnName is { } name
            ? leaves.FirstOrDefault(c => c.Key == name || c.FieldName == name)
            : leaves.FirstOrDefault(c => c.IsDataColumn));

    /// <summary>Whether <paramref name="item"/> is <paramref name="root"/> or one of its descendants.</summary>
    private bool IsInBranch(TItem item, TItem root)
    {
        if (!treeNodes.TryGetValue(KeyOf(item), out var node) || !treeNodes.TryGetValue(KeyOf(root), out var top)) return false;
        return IsAncestor(top, node);
    }

    private int TreeLevelOf(TItem item) =>
        treeNodes.TryGetValue(KeyOf(item), out var node) ? node.Level : 0;

    // ------------------------------------------------------------------------------ recursive selection

    private Task ToggleTreeSelectionAsync(TItem item)
    {
        var select = TreeCheckState(item) != true;
        ApplyRecursiveSelection(item, select);
        return AfterSelectionChangeAsync();
    }

    private void ApplyRecursiveSelection(TItem item, bool select)
    {
        if (!treeNodes.TryGetValue(KeyOf(item), out var node))
        {
            if (select) selected[KeyOf(item)] = item;
            else selected.Remove(KeyOf(item));
            return;
        }
        foreach (var target in Descendants(node).Prepend(node))
        {
            if (select) selected[target.Key] = target.Item;
            else selected.Remove(target.Key);
        }
        // A parent is selected exactly when all its children are.
        for (var parent = node.Parent; parent is not null; parent = parent.Parent)
        {
            if (parent.Children.All(c => selected.ContainsKey(c.Key))) selected[parent.Key] = parent.Item;
            else selected.Remove(parent.Key);
        }
    }

    /// <summary>Recursive selection: true when the node and its subtree are selected, null when partly.</summary>
    private bool? TreeCheckState(TItem item)
    {
        if (!treeNodes.TryGetValue(KeyOf(item), out var node) || node.Children.Count == 0) return IsSelected(item);
        var all = Descendants(node).ToList();
        var count = all.Count(n => selected.ContainsKey(n.Key));
        if (count == all.Count && IsSelected(item)) return true;
        return count == 0 && !IsSelected(item) ? false : null;
    }

    // ------------------------------------------------------------------------------ new child rows

    // Batch rows (and the pending new row) under a parent: item -> parent key.
    private readonly Dictionary<object, object> newRowParents = new(ReferenceEqualityComparer.Instance);

    /// <summary>
    /// Tree mode: opens the editor for a new row under <paramref name="parent"/>; its parent key field is
    /// set (flat data), or it is added to the parent's children collection on save (nested data).
    /// </summary>
    public async Task StartEditNewChildRowAsync(TItem parent)
    {
        newRowParent = parent;
        await SetNodeExpandedAsync(parent, true);
        await StartNewRowAsync();
    }

    /// <summary>Applies the pending new row's parent (called once the new edit model exists).</summary>
    private void AttachNewRowToParent(TItem model)
    {
        var tree = TreeConfig;
        if (tree is null || newRowParent is null || model is null) return;
        var parentKey = KeyOf(newRowParent);
        if (tree.ParentKeyFieldName is not null)
        {
            try
            {
                GridField.SetValue(model, tree.ParentKeyFieldName, parentKey);
            }
            catch (Exception e) when (e is ArgumentException or InvalidCastException or FormatException)
            {
            }
        }
        newRowParents[model] = parentKey;
    }

    /// <summary>Nested data: adds a saved new row to its parent's children collection.</summary>
    private bool AddToParentChildren(TItem model)
    {
        var tree = TreeConfig;
        if (tree?.ChildrenFieldName is null || !newRowParents.TryGetValue(model!, out var parentKey) || !treeNodes.TryGetValue(parentKey, out var parent)) return false;
        if (GridField.GetValue(parent.Item!, tree.ChildrenFieldName) is IList { IsReadOnly: false, IsFixedSize: false } children)
        {
            children.Add(model);
            return true;
        }
        return false;
    }

    private void ClearNewRowParent(TItem? model)
    {
        if (model is not null) newRowParents.Remove(model);
        newRowParent = default;
    }

    /// <summary>The new row editor goes right under its parent row instead of at the top or bottom.</summary>
    private bool NewRowUnderParent => IsTree && editIsNew && newRowParent is not null && EditMode is not PBGridEditMode.PopupEditForm and not PBGridEditMode.Batch;

    private bool IsNewRowParent(TItem item) => NewRowUnderParent && Equals(KeyOf(newRowParent!), KeyOf(item));
}
