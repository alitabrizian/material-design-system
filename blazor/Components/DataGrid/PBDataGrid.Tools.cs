using System.Globalization;
using Microsoft.JSInterop;

namespace PartoBita.DesignSystem.Blazor.Components;

public partial class PBDataGrid<TItem> : IGridDragSource
{
    // ------------------------------------------------------------------------------ export

    /// <summary>Downloads the grid's rows (all pages, filtered and sorted, grouped) as an Excel workbook.</summary>
    public Task ExportToXlsxAsync(string fileName = "export.xlsx", PBGridExportOptions? options = null)
    {
        options ??= new PBGridExportOptions();
        var (columns, rows) = ExportData(options);
        var widths = columns.Select(c => Math.Clamp((PixelWidth(c) ?? 120) / 7.0, 8, 60)).ToList();
        var bytes = GridExport.ToXlsx(options.SheetName, columns.Select(c => c.DisplayCaption).ToList(), widths, rows);
        return DownloadAsync(fileName, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);
    }

    /// <summary>Downloads the grid's rows as CSV.</summary>
    public Task ExportToCsvAsync(string fileName = "export.csv", PBGridExportOptions? options = null)
    {
        options ??= new PBGridExportOptions { ExportGroups = false };
        var (columns, rows) = ExportData(options);
        var bytes = GridExport.ToCsv(columns.Select(c => c.DisplayCaption).ToList(), rows);
        return DownloadAsync(fileName, "text/csv", bytes);
    }

    private async Task DownloadAsync(string fileName, string contentType, byte[] bytes)
    {
        using var content = new DotNetStreamReference(new MemoryStream(bytes));
        await DesignSystemJs.InvokeVoidAsync(JS, "downloadFile", fileName, contentType, content);
    }

    private (List<PBDataGridColumn> Columns, List<ExportRow> Rows) ExportData(PBGridExportOptions options)
    {
        EnsureData();
        var columns = OrderedLeaves().Where(c => c.CurrentVisible && c.IsDataColumn && c.ExportEnabled).ToList();
        IReadOnlyList<TItem> items = filteredQuery is not null ? filteredQuery.ToList() : filteredItems;
        if (options.SelectedRowsOnly) items = items.Where(IsSelected).ToList();
        var rows = new List<ExportRow>();
        var grouped = options.ExportGroups && groupedColumns.Count > 0 && filteredQuery is null;

        ExportRow DataRow(TItem item, int level) =>
            new(columns.Select(c => new ExportCell(c.GetValue(item!))).ToList(), level);

        void Walk(List<GridGroup> groups)
        {
            foreach (var group in groups)
            {
                var summaries = group.RowSummaries.Count > 0 ? group.RowSummaries.Select(s => s.DisplayText) : [$"Count: {group.Items.Count}"];
                var text = $"{group.Column.DisplayCaption}: {group.Text} ({string.Join(", ", summaries)})";
                var cells = new List<ExportCell> { new(text, Bold: true) };
                rows.Add(new ExportRow(cells, group.Level));
                if (group.Children is not null) Walk(group.Children);
                else rows.AddRange(group.Items.Select(i => DataRow(i, group.Level + 1)));
            }
        }

        if (grouped) Walk(BuildGroups([.. items], 0, ""));
        // Tree mode: the outline level is the node depth (Excel shows the hierarchy as outline groups).
        else if (IsTree) rows.AddRange(items.Select(i => DataRow(i, TreeLevelOf(i))));
        else rows.AddRange(items.Select(i => DataRow(i, 0)));

        if (options.ExportTotalSummary)
        {
            var defs = TotalSummaryDefs().ToList();
            if (defs.Count > 0)
            {
                var values = defs.Select(d => filteredQuery is not null ? SummaryOverQuery(d, filteredQuery) : Summary(d, items, null, false)).ToList();
                var cells = columns.Select(c =>
                {
                    var texts = FooterSummariesFor(values, c, defs);
                    if (texts.Count == 1 && texts[0].Value is { } v && texts[0].SummaryType != PBGridSummaryType.Custom) return new ExportCell(v, Bold: true);
                    return new ExportCell(texts.Count == 0 ? null : string.Join("; ", texts.Select(t => t.DisplayText)), Bold: true);
                }).ToList();
                rows.Add(new ExportRow(cells));
            }
        }
        return (columns, rows);
    }

    // ------------------------------------------------------------------------------ column chooser

    private bool columnChooserOpen;
    private PBDataGridColumn? chooserDragged;

    /// <summary>Opens the column chooser (show, hide and reorder columns).</summary>
    public void ShowColumnChooser()
    {
        columnChooserOpen = true;
        StateHasChanged();
    }

    private IEnumerable<(PBDataGridColumn Column, int Depth)> ChooserColumns()
    {
        IEnumerable<(PBDataGridColumn, int)> Walk(PBDataGridBandColumn? band, int depth)
        {
            foreach (var column in allColumns.Where(c => c.Band == band).OrderBy(c => c.CurrentVisibleIndex).ThenBy(c => c.Order))
            {
                if (!column.ShowInColumnChooser) continue;
                yield return (column, depth);
                if (column is PBDataGridBandColumn child)
                    foreach (var nested in Walk(child, depth + 1)) yield return nested;
            }
        }
        return Walk(null, 0);
    }

    private async Task ToggleChooserColumnAsync(PBDataGridColumn column)
    {
        column.CurrentVisible = !column.CurrentVisible;
        Invalidate();
        await LayoutChangedAsync();
    }

    private async Task MoveChooserColumnAsync(PBDataGridColumn column, int delta)
    {
        var siblings = allColumns.Where(c => c.Band == column.Band).OrderBy(c => c.CurrentVisibleIndex).ThenBy(c => c.Order).ToList();
        var index = siblings.IndexOf(column);
        var target = index + delta;
        if (target < 0 || target >= siblings.Count) return;
        MoveColumn(column.Key, siblings[target].Key, after: delta > 0);
        await LayoutChangedAsync();
    }

    private async Task DropChooserColumnAsync(PBDataGridColumn target)
    {
        if (chooserDragged is null || chooserDragged == target || chooserDragged.Band != target.Band) return;
        var siblings = allColumns.Where(c => c.Band == target.Band).OrderBy(c => c.CurrentVisibleIndex).ThenBy(c => c.Order).ToList();
        var after = siblings.IndexOf(chooserDragged) < siblings.IndexOf(target);
        MoveColumn(chooserDragged.Key, target.Key, after);
        chooserDragged = null;
        await LayoutChangedAsync();
    }

    // ------------------------------------------------------------------------------ filter builder

    private sealed class FilterNode
    {
        public bool IsGroup { get; init; }
        public bool IsOr { get; set; }
        public List<FilterNode> Children { get; } = [];
        public string? Field { get; set; }
        public PBGridFilterOperator Operator { get; set; }
        public string? Value { get; set; }
    }

    private bool filterBuilderOpen;
    private FilterNode filterBuilderRoot = new() { IsGroup = true };

    /// <summary>Opens the filter builder on the current filter (criteria, filter row and filter menus).</summary>
    public void ShowFilterBuilder()
    {
        filterBuilderRoot = ToNode(UserFilter());
        if (!filterBuilderRoot.IsGroup)
        {
            var root = new FilterNode { IsGroup = true };
            root.Children.Add(filterBuilderRoot);
            filterBuilderRoot = root;
        }
        filterBuilderOpen = true;
        StateHasChanged();
    }

    private FilterNode ToNode(PBGridFilter? filter)
    {
        switch (filter)
        {
            case PBGridGroupFilter group:
                var node = new FilterNode { IsGroup = true, IsOr = group.IsOr };
                node.Children.AddRange(group.Filters.Select(ToNode));
                return node;
            case PBGridConditionFilter condition:
                return new FilterNode { Field = condition.Field, Operator = condition.Operator, Value = FilterValueText(condition.Value) };
            case PBGridInFilter list:
                var or = new FilterNode { IsGroup = true, IsOr = true };
                or.Children.AddRange(list.Values.Select(v => v is null
                    ? new FilterNode { Field = list.Field, Operator = PBGridFilterOperator.IsBlank }
                    : new FilterNode { Field = list.Field, Operator = PBGridFilterOperator.Equals, Value = FilterValueText(v) }));
                return or;
            default:
                return new FilterNode { IsGroup = true };
        }
    }

    private static string? FilterValueText(object? value) => value switch
    {
        null => null,
        DateTime d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        IFormattable f when GridField.IsNumeric(value.GetType()) => f.ToString(null, CultureInfo.InvariantCulture),
        _ => value.ToString(),
    };

    private PBGridFilter? ToFilter(FilterNode node)
    {
        if (node.IsGroup)
        {
            var parts = node.Children.Select(ToFilter).Where(f => f is not null).ToArray();
            return node.IsOr ? PBGridFilter.Or(parts) : PBGridFilter.And(parts);
        }
        if (node.Field is null) return null;
        if (node.Operator is PBGridFilterOperator.IsBlank or PBGridFilterOperator.IsNotBlank) return PBGridFilter.Condition(node.Field, node.Operator);
        if (string.IsNullOrEmpty(node.Value)) return null;
        var type = ((IGridFieldSource)this).FieldType(node.Field) ?? typeof(string);
        var editor = BuilderEditor(node.Field);
        object? value = node.Value;
        try
        {
            value = ParseEditorInput(node.Value, type, editor);
        }
        catch (Exception e) when (e is FormatException or OverflowException or InvalidCastException)
        {
        }
        return PBGridFilter.Condition(node.Field, node.Operator, value);
    }

    private PBGridEditorType BuilderEditor(string field)
    {
        var column = FieldColumn(field);
        if (column is null) return PBGridEditorType.Text;
        var editor = column.ResolvedEditor(typeof(TItem));
        return editor is PBGridEditorType.TextArea or PBGridEditorType.None ? PBGridEditorType.Text : editor;
    }

    private IEnumerable<PBDataGridColumn> FilterableColumns => OrderedLeaves().Where(c => c.CanFilter);

    private void AddCondition(FilterNode group)
    {
        var column = FilterableColumns.FirstOrDefault();
        if (column is null) return;
        group.Children.Add(new FilterNode { Field = FilterField(column), Operator = column.DefaultFilterOperator(typeof(TItem)) });
    }

    private static void AddGroup(FilterNode group)
    {
        var child = new FilterNode { IsGroup = true };
        group.Children.Add(child);
    }

    private static void RemoveNode(FilterNode parent, FilterNode node) => parent.Children.Remove(node);

    private void SetConditionField(FilterNode node, string? field)
    {
        node.Field = field;
        node.Value = null;
        var operators = PBGridFilter.OperatorsFor(field is null ? null : ((IGridFieldSource)this).FieldType(field));
        if (!operators.Contains(node.Operator)) node.Operator = operators[0];
    }

    private async Task ApplyFilterBuilderAsync()
    {
        foreach (var column in allColumns)
        {
            column.FilterRowText = null;
            column.FilterValues = null;
        }
        filterBuilderOpen = false;
        await SetFilterCriteriaAsync(ToFilter(filterBuilderRoot));
    }

    // ------------------------------------------------------------------------------ row drag and drop

    private List<object?> draggedItems = [];

    IReadOnlyList<object?> IGridDragSource.DraggedItems => draggedItems;

    [JSInvokable]
    public void OnRowDragStart(int rowIndex)
    {
        var item = ItemAtRow(rowIndex);
        if (item is null)
        {
            draggedItems = [];
            return;
        }
        draggedItems = IsSelected(item) && selected.Count > 1
            ? allRows.Where(r => r.Kind == GridRowKind.Data && IsSelected(r.Item!)).Select(r => (object?)r.Item).ToList()
            : [item];
    }

    [JSInvokable]
    public async Task OnRowDrop(string sourceGridId, int targetIndex, string position)
    {
        var source = GridDragRegistry.Find(JS, sourceGridId);
        if (source is null) return;
        var items = source.DraggedItems.OfType<TItem>().ToList();
        if (items.Count == 0) return;
        var target = targetIndex >= 0 ? ItemAtRow(targetIndex) : default;
        var isExternal = !ReferenceEquals(source, this);
        if (!isExternal && target is not null && items.Any(i => Equals(KeyOf(i), KeyOf(target)))) return;
        // Tree mode: a node cannot move into its own branch.
        if (!isExternal && target is not null && IsTree && items.Any(i => IsInBranch(target, i))) return;
        var dropPosition = position switch { "before" => PBGridDropPosition.Before, "inside" => PBGridDropPosition.Inside, _ => PBGridDropPosition.After };
        var args = new PBGridItemsDroppedEventArgs<TItem>(items, target, dropPosition, source, isExternal);
        await ItemsDropped.InvokeAsync(args);
        if (isExternal) source.Invalidate();
        Invalidate();
    }

    private object? focusItemKeyAfterRender;

    private async Task MoveRowByKeyboardAsync(GridRow row, bool down)
    {
        var rows = pageRows.Where(r => r.Kind == GridRowKind.Data && !r.IsInserted).ToList();
        var position = rows.FindIndex(r => r.Index == row.Index);
        var neighbour = position + (down ? 1 : -1);
        if (position < 0 || neighbour < 0 || neighbour >= rows.Count) return;
        var args = new PBGridItemsDroppedEventArgs<TItem>([row.Item!], rows[neighbour].Item, down ? PBGridDropPosition.After : PBGridDropPosition.Before, this, false);
        await ItemsDropped.InvokeAsync(args);
        focusItemKeyAfterRender = KeyOf(row.Item!);
        Invalidate();
    }

    private void ResolveFocusItem()
    {
        if (focusItemKeyAfterRender is null) return;
        var row = allRows.FirstOrDefault(r => r.Kind == GridRowKind.Data && Equals(KeyOf(r.Item!), focusItemKeyAfterRender));
        focusItemKeyAfterRender = null;
        if (row is null) return;
        keyboardRow = row.Index;
        focusRowAfterRender = row.Index;
    }
}
