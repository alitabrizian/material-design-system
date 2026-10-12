namespace PartoBita.DesignSystem.Blazor.Components;

public enum PBGridSortOrder { None, Ascending, Descending }

public enum PBGridSelectionMode { None, Single, Multiple }

/// <summary>Which rows the select-all checkbox toggles.</summary>
public enum PBGridSelectAllMode { Page, AllPages }

public enum PBGridEditMode
{
    /// <summary>An edit form below the row, spanning all columns.</summary>
    EditForm,

    /// <summary>The edit form in a dialog.</summary>
    PopupEditForm,

    /// <summary>Editors in the row's cells.</summary>
    EditRow,

    /// <summary>Click a cell to edit it; each change is saved on its own.</summary>
    EditCell,

    /// <summary>Edit any cells; changes are kept until Save (or dropped by Cancel).</summary>
    Batch,
}

public enum PBGridNewItemRowPosition { Disabled, Top, Bottom }

public enum PBGridGroupInterval
{
    /// <summary>One group per distinct value.</summary>
    Value,

    /// <summary>One group per first letter.</summary>
    Alphabetical,

    /// <summary>One group per day (date part of a date/time value).</summary>
    Date,

    Month,
    Year,

    /// <summary>The column's <c>CustomGroupKey</c> decides the group.</summary>
    Custom,
}

public enum PBGridSummaryType { Count, Sum, Min, Max, Average, Custom }

public enum PBGridFixedPosition { None, Left, Right }

public enum PBGridColumnResizeMode
{
    Disabled,

    /// <summary>Dragging a column edge resizes the column and its right neighbour.</summary>
    NextColumn,

    /// <summary>Dragging a column edge resizes the column; the grid grows or shrinks.</summary>
    ColumnsContainer,
}

public enum PBGridLines { Horizontal, Vertical, Both, None }

public enum PBGridPagerPosition { Bottom, Top, TopAndBottom }

public enum PBGridDetailRowDisplayMode
{
    /// <summary>Detail rows open from an expand button.</summary>
    Auto,

    /// <summary>Every row shows its detail row.</summary>
    Always,
}

/// <summary>Where dropped rows go relative to the target row; <c>Inside</c> (tree mode) makes them its children.</summary>
public enum PBGridDropPosition { Before, After, Inside }

/// <summary>Where rows may be dropped while dragging rows of this grid.</summary>
[Flags]
public enum PBGridDropTarget
{
    None = 0,

    /// <summary>Reorder within the grid.</summary>
    Internal = 1,

    /// <summary>Move to another grid of the same <c>DragDropGroup</c>.</summary>
    External = 2,

    All = Internal | External,
}

[Flags]
public enum PBGridContextMenus
{
    None = 0,
    Header = 1,
    DataRow = 2,
    GroupPanel = 4,
    Footer = 8,
    All = Header | DataRow | GroupPanel | Footer,
}

public enum PBGridContextMenuTarget { Header, DataRow, GroupPanel, Footer }

public enum PBGridElementType { DataRow, DataCell, HeaderCell, GroupRow, FooterCell, GroupFooterCell }

/// <summary>A cell's value and display text, passed to cell templates.</summary>
public sealed record PBGridCellContext(object DataItem, PBDataGridColumn Column, object? Value, string DisplayText, int VisibleIndex)
{
    /// <summary>Text matched by the search box, for highlighting (null when no search).</summary>
    public string? SearchText { get; init; }
}

/// <summary>An editor's state, passed to edit templates.</summary>
public sealed class PBGridEditContext
{
    internal PBGridEditContext(object editModel, PBDataGridColumn column, Microsoft.AspNetCore.Components.Forms.EditContext editContext, Action<object?> setValue, bool isNew)
    {
        EditModel = editModel;
        Column = column;
        EditContext = editContext;
        SetValueAction = setValue;
        IsNew = isNew;
    }

    private Action<object?> SetValueAction { get; }

    public object EditModel { get; }
    public PBDataGridColumn Column { get; }
    public Microsoft.AspNetCore.Components.Forms.EditContext EditContext { get; }
    public bool IsNew { get; }
    public object? Value => Column.GetValue(EditModel);

    /// <summary>Writes the column's field on the edit model and re-validates it.</summary>
    public void SetValue(object? value) => SetValueAction(value);
}

public sealed record PBGridGroupRowContext(PBDataGridColumn Column, object? GroupValue, string DisplayText, int Count, IReadOnlyList<string> SummaryTexts, int Level, bool Expanded);

/// <summary>One computed summary in a footer, group row or group footer.</summary>
public sealed record PBGridSummaryValue(PBGridSummaryType SummaryType, string? FieldName, string? Name, object? Value, string DisplayText);

public sealed class PBGridEditModelSavingEventArgs<TItem>
{
    internal PBGridEditModelSavingEventArgs(TItem editModel, TItem? dataItem, bool isNew)
    {
        EditModel = editModel;
        DataItem = dataItem;
        IsNew = isNew;
    }

    /// <summary>The edited copy (new items: the new object).</summary>
    public TItem EditModel { get; }

    /// <summary>The original item (null for new items).</summary>
    public TItem? DataItem { get; }

    public bool IsNew { get; }

    /// <summary>Tree mode: the parent of a new child row (default otherwise).</summary>
    public TItem? ParentDataItem { get; internal init; }

    /// <summary>Keeps the editor open and changes nothing.</summary>
    public bool Cancel { get; set; }
}

public sealed class PBGridCustomizeEditModelEventArgs<TItem>
{
    internal PBGridCustomizeEditModelEventArgs(TItem editModel, TItem? dataItem, bool isNew)
    {
        EditModel = editModel;
        DataItem = dataItem;
        IsNew = isNew;
    }

    /// <summary>The object the editors write to; replace it to supply your own (e.g. defaults for a new row).</summary>
    public TItem EditModel { get; set; }

    public TItem? DataItem { get; }

    public bool IsNew { get; }

    /// <summary>Tree mode: the parent of a new child row (its parent key is already set for flat data).</summary>
    public TItem? ParentDataItem { get; internal init; }
}

/// <summary>Context of a custom edit form (<c>EditFormTemplate</c>).</summary>
public sealed class PBGridEditFormContext<TItem>
{
    internal PBGridEditFormContext(TItem editModel, Microsoft.AspNetCore.Components.Forms.EditContext editContext, bool isNew, Func<string, RenderFragment> editorFor)
    {
        EditModel = editModel;
        EditContext = editContext;
        IsNew = isNew;
        EditorFor = editorFor;
    }

    public TItem EditModel { get; }
    public Microsoft.AspNetCore.Components.Forms.EditContext EditContext { get; }
    public bool IsNew { get; }

    /// <summary>The grid's editor for a column (by FieldName or Name).</summary>
    public Func<string, RenderFragment> EditorFor { get; }
}

public sealed record PBGridExportOptions
{
    /// <summary>Only the selected rows.</summary>
    public bool SelectedRowsOnly { get; init; }

    /// <summary>Writes group rows (outlined); off exports a flat list.</summary>
    public bool ExportGroups { get; init; } = true;

    public bool ExportTotalSummary { get; init; } = true;

    public string SheetName { get; init; } = "Sheet1";
}

public sealed class PBGridDataItemDeletingEventArgs<TItem>
{
    internal PBGridDataItemDeletingEventArgs(TItem dataItem) => DataItem = dataItem;

    public TItem DataItem { get; }

    public bool Cancel { get; set; }
}

/// <summary>Batch edit: every change waiting for Save.</summary>
public sealed record PBGridBatchChanges<TItem>(IReadOnlyList<PBGridBatchUpdate<TItem>> UpdatedItems, IReadOnlyList<TItem> InsertedItems, IReadOnlyList<TItem> DeletedItems);

/// <summary>A changed row in batch mode: the original item and its edited copy.</summary>
public sealed record PBGridBatchUpdate<TItem>(TItem DataItem, TItem EditModel);

public sealed class PBGridCustomSummaryEventArgs
{
    internal PBGridCustomSummaryEventArgs(string? name, string? fieldName, IReadOnlyList<object> dataItems, object? groupValue)
    {
        Name = name;
        FieldName = fieldName;
        DataItems = dataItems;
        GroupValue = groupValue;
    }

    /// <summary>The summary item's <c>Name</c>.</summary>
    public string? Name { get; }

    public string? FieldName { get; }

    /// <summary>The rows the summary covers (the group's rows for a group summary).</summary>
    public IReadOnlyList<object> DataItems { get; }

    /// <summary>The group's key, or null for a total summary.</summary>
    public object? GroupValue { get; }

    public object? Value { get; set; }
}

public sealed class PBGridCustomizeElementEventArgs
{
    internal PBGridCustomizeElementEventArgs(PBGridElementType elementType, object? dataItem, PBDataGridColumn? column, object? value, int visibleIndex)
    {
        ElementType = elementType;
        DataItem = dataItem;
        Column = column;
        Value = value;
        VisibleIndex = visibleIndex;
    }

    public PBGridElementType ElementType { get; }
    public object? DataItem { get; }
    public PBDataGridColumn? Column { get; }
    public object? Value { get; }
    public int VisibleIndex { get; }

    /// <summary>Extra CSS class(es) for the element.</summary>
    public string? CssClass { get; set; }

    /// <summary>Extra inline style for the element (use design tokens, e.g. var(--md-sys-color-error)).</summary>
    public string? Style { get; set; }
}

public sealed record PBGridItemsDroppedEventArgs<TItem>(IReadOnlyList<TItem> DroppedItems, TItem? TargetItem, PBGridDropPosition DropPosition, object? SourceGrid, bool IsExternal);

public sealed class PBGridContextMenuItem
{
    public PBGridContextMenuItem(string text, Func<Task> action, string? icon = null)
    {
        Text = text;
        Action = action;
        Icon = icon;
    }

    public string Text { get; }
    public string? Icon { get; }
    public Func<Task> Action { get; }
    public bool Disabled { get; init; }

    /// <summary>Draws a divider above the item.</summary>
    public bool BeginGroup { get; init; }
}

public sealed class PBGridContextMenuEventArgs
{
    internal PBGridContextMenuEventArgs(PBGridContextMenuTarget target, PBDataGridColumn? column, object? dataItem, List<PBGridContextMenuItem> items)
    {
        Target = target;
        Column = column;
        DataItem = dataItem;
        Items = items;
    }

    public PBGridContextMenuTarget Target { get; }
    public PBDataGridColumn? Column { get; }
    public object? DataItem { get; }

    /// <summary>The menu's items; add, remove or reorder them.</summary>
    public List<PBGridContextMenuItem> Items { get; }
}

/// <summary>A serializable snapshot of the grid's user state (Save and Restore Layout).</summary>
public sealed record PBGridLayout
{
    public int PageSize { get; init; }
    public int PageIndex { get; init; }
    public string? SearchText { get; init; }
    public IReadOnlyList<PBGridColumnLayout> Columns { get; init; } = [];
}

public sealed record PBGridColumnLayout
{
    public required string Key { get; init; }
    public bool Visible { get; init; }
    public int VisibleIndex { get; init; }
    public string? Width { get; init; }
    public PBGridSortOrder SortOrder { get; init; }
    public int SortIndex { get; init; }
    public int GroupIndex { get; init; }
    public string? FilterRowValue { get; init; }
    public PBGridFilterOperator FilterRowOperator { get; init; }
    public IReadOnlyList<string>? FilterValues { get; init; }
}

/// <summary>Server mode: the grid asks for one page of already filtered and sorted rows.</summary>
public sealed record PBGridDataRequest(int Skip, int Take, IReadOnlyList<(string Field, PBGridSortOrder Order)> Sort, PBGridFilter? Filter, string? SearchText);

public sealed record PBGridDataResult<TItem>(IReadOnlyList<TItem> Items, int TotalCount);
