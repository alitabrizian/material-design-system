namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>Which nodes a <see cref="PBTreeList{TItem}"/> shows while a filter or search is active.</summary>
public enum PBTreeListFilterTreeMode
{
    /// <summary>Matching nodes and their ancestors (the path to each match), expanded.</summary>
    ParentBranch,

    /// <summary>Matching nodes with their ancestors and all their descendants.</summary>
    EntireBranch,

    /// <summary>Only matching nodes; a match whose parent does not match is shown at the root.</summary>
    Matches,
}

/// <summary>A node's children were requested (<see cref="PBTreeList{TItem}.ChildrenLoadingOnDemand"/>).</summary>
public sealed class PBTreeListChildrenLoadingEventArgs<TItem>
{
    internal PBTreeListChildrenLoadingEventArgs(TItem parent, CancellationToken cancellationToken)
    {
        Parent = parent;
        CancellationToken = cancellationToken;
    }

    public TItem Parent { get; }

    public CancellationToken CancellationToken { get; }

    /// <summary>Set to the parent's children.</summary>
    public IEnumerable<TItem>? Children { get; set; }
}

/// <summary>A node was expanded or collapsed.</summary>
public sealed record PBTreeListNodeExpandedEventArgs<TItem>(TItem DataItem, bool Expanded);

/// <summary>Tree settings of a data grid (set by <see cref="PBTreeList{TItem}"/>).</summary>
internal sealed class GridTreeConfig<TItem>
{
    public string? ParentKeyFieldName { get; init; }
    public string? ChildrenFieldName { get; init; }
    public string? HasChildrenFieldName { get; init; }
    public object? RootValue { get; init; }
    public Func<PBTreeListChildrenLoadingEventArgs<TItem>, Task>? LoadChildren { get; init; }
    public bool AutoExpandAllNodes { get; init; }
    public PBTreeListFilterTreeMode FilterTreeMode { get; init; }
    public bool RecursiveSelection { get; init; }
    public string? TreeColumnName { get; init; }
    public Func<PBTreeListNodeExpandedEventArgs<TItem>, Task>? NodeExpandedChanged { get; init; }
}
