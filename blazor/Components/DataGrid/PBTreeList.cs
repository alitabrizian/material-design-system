namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// Material 3 tree list (DevExpress TreeList): a <see cref="PBDataGrid{TItem}"/> whose rows form a
/// hierarchy, with an expand button and indent in the first data column (or <see cref="TreeColumnName"/>).
/// Bind flat data with <c>KeyFieldName</c> + <see cref="ParentKeyFieldName"/>, nested data with
/// <see cref="ChildrenFieldName"/>, or load children on demand with <see cref="HasChildrenFieldName"/> +
/// <see cref="ChildrenLoadingOnDemand"/>. Every grid feature works on the tree: sorting (among siblings),
/// filter row, menus, panel and search (with <see cref="FilterTreeMode"/>), editing (including new child
/// rows), summaries, selection (optionally recursive), focus, columns, bands, export, layout, context
/// menus, paging, virtual scrolling and drag and drop (before, after or inside a node). Grouping is off.
/// </summary>
public class PBTreeList<TItem> : PBDataGrid<TItem>
{
    public PBTreeList()
    {
        AllowGroup = false;
    }

    /// <summary>Flat data: the field holding the parent's key (null, missing or <see cref="RootValue"/> = root).</summary>
    [Parameter] public string? ParentKeyFieldName { get; set; }

    /// <summary>Nested data: the field holding the item's children collection.</summary>
    [Parameter] public string? ChildrenFieldName { get; set; }

    /// <summary>A bool field: true when the item has children to load on demand.</summary>
    [Parameter] public string? HasChildrenFieldName { get; set; }

    /// <summary>Flat data: the parent key value of root nodes besides null (e.g. 0).</summary>
    [Parameter] public object? RootValue { get; set; }

    /// <summary>Loads a node's children when it is first expanded (set <c>Children</c>).</summary>
    [Parameter] public EventCallback<PBTreeListChildrenLoadingEventArgs<TItem>> ChildrenLoadingOnDemand { get; set; }

    /// <summary>Every node starts expanded.</summary>
    [Parameter] public bool AutoExpandAllNodes { get; set; }

    /// <summary>Which nodes stay visible while a filter or search is active.</summary>
    [Parameter] public PBTreeListFilterTreeMode FilterTreeMode { get; set; }

    /// <summary>Checking a node checks its whole branch; a parent is checked when all its children are.</summary>
    [Parameter] public bool AllowRecursiveSelection { get; set; }

    /// <summary>The column (field name or Name) that shows the expand buttons; default: the first data column.</summary>
    [Parameter] public string? TreeColumnName { get; set; }

    /// <summary>A node was expanded or collapsed.</summary>
    [Parameter] public EventCallback<PBTreeListNodeExpandedEventArgs<TItem>> RowExpandedChanged { get; set; }

    private GridTreeConfig<TItem>? config;

    private protected override GridTreeConfig<TItem>? TreeConfig => config;

    protected override void OnParametersSet()
    {
        config = new GridTreeConfig<TItem>
        {
            ParentKeyFieldName = ParentKeyFieldName,
            ChildrenFieldName = ChildrenFieldName,
            HasChildrenFieldName = HasChildrenFieldName,
            RootValue = RootValue,
            LoadChildren = ChildrenLoadingOnDemand.HasDelegate ? args => ChildrenLoadingOnDemand.InvokeAsync(args) : null,
            AutoExpandAllNodes = AutoExpandAllNodes,
            FilterTreeMode = FilterTreeMode,
            RecursiveSelection = AllowRecursiveSelection,
            TreeColumnName = TreeColumnName,
            NodeExpandedChanged = RowExpandedChanged.HasDelegate ? args => RowExpandedChanged.InvokeAsync(args) : null,
        };
        base.OnParametersSet();
    }
}
