namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// A column of a multi-column <see cref="PBChips{TItem, TValue}"/> dropdown list (DxListEditorColumn).
/// Put columns in the editor's <c>Columns</c> fragment.
/// </summary>
public sealed class PBChipsColumn : ComponentBase, IDisposable
{
    [CascadingParameter] private IPBChipsColumnOwner? Owner { get; set; }

    /// <summary>The data item property shown in this column.</summary>
    [Parameter, EditorRequired] public string FieldName { get; set; } = "";

    [Parameter] public string? Caption { get; set; }

    /// <summary>A CSS width (<c>120px</c>, <c>30%</c>); columns without one share the remaining space.</summary>
    [Parameter] public string? Width { get; set; }

    [Parameter] public bool Visible { get; set; } = true;
    [Parameter] public EventCallback<bool> VisibleChanged { get; set; }

    /// <summary>Display order; columns keep their markup order when it is not set.</summary>
    [Parameter] public int VisibleIndex { get; set; } = -1;
    [Parameter] public EventCallback<int> VisibleIndexChanged { get; set; }

    /// <summary>Search text is matched against this column's cells.</summary>
    [Parameter] public bool SearchEnabled { get; set; } = true;

    /// <summary>Custom cell content.</summary>
    [Parameter] public RenderFragment<PBChipsCellContext>? CellDisplayTemplate { get; set; }

    internal int Order { get; set; }

    protected override void OnInitialized() => Owner?.AddColumn(this);

    private (string, string?, string?, bool, int, bool)? lastState;

    // The owner re-renders its columns on every render: only report changes that affect the list,
    // otherwise each render would trigger the next one.
    protected override void OnParametersSet()
    {
        var state = (FieldName, Caption, Width, Visible, VisibleIndex, SearchEnabled);
        if (lastState is not null && lastState != state) Owner?.ColumnChanged();
        lastState = state;
    }

    public void Dispose() => Owner?.RemoveColumn(this);
}
