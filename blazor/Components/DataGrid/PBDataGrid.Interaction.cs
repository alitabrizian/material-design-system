using System.Globalization;
using Microsoft.JSInterop;

namespace PartoBita.DesignSystem.Blazor.Components;

public partial class PBDataGrid<TItem>
{
    // ------------------------------------------------------------------------------ selection

    private readonly Dictionary<object, TItem> selected = [];
    private IReadOnlyList<TItem>? lastSelectedParam;
    private TItem? lastSelectedItemParam;
    private int? selectionAnchor;

    private void SyncSelectionFromParameters()
    {
        if (SelectionMode == PBGridSelectionMode.Single)
        {
            if (!EqualityComparer<TItem?>.Default.Equals(SelectedDataItem, lastSelectedItemParam))
            {
                selected.Clear();
                if (SelectedDataItem is not null) selected[KeyOf(SelectedDataItem)] = SelectedDataItem;
            }
            lastSelectedItemParam = SelectedDataItem;
        }
        else if (!ReferenceEquals(SelectedDataItems, lastSelectedParam))
        {
            selected.Clear();
            foreach (var item in SelectedDataItems ?? []) selected[KeyOf(item)] = item;
            lastSelectedParam = SelectedDataItems;
        }
    }

    public bool IsSelected(TItem item) => selected.ContainsKey(KeyOf(item));

    /// <summary>The selected items, in selection order.</summary>
    public IReadOnlyList<TItem> GetSelectedDataItems() => selected.Values.ToList();

    private async Task NotifySelectionAsync()
    {
        var items = selected.Values.ToList();
        lastSelectedParam = items;
        await SelectedDataItemsChanged.InvokeAsync(items);
        var single = items.Count > 0 ? items[^1] : default;
        lastSelectedItemParam = single;
        await SelectedDataItemChanged.InvokeAsync(single);
    }

    public async Task SelectDataItemAsync(TItem item, bool select = true)
    {
        if (SelectionMode == PBGridSelectionMode.None) return;
        if (SelectionMode == PBGridSelectionMode.Single && select) selected.Clear();
        if (select) selected[KeyOf(item)] = item;
        else selected.Remove(KeyOf(item));
        await NotifySelectionAsync();
        StateHasChanged();
    }

    public Task SelectDataItemsAsync(IEnumerable<TItem> items, bool select = true)
    {
        foreach (var item in items)
        {
            if (select) selected[KeyOf(item)] = item;
            else selected.Remove(KeyOf(item));
        }
        return AfterSelectionChangeAsync();
    }

    private async Task AfterSelectionChangeAsync()
    {
        await NotifySelectionAsync();
        StateHasChanged();
    }

    /// <summary>Selects every row (of the page or of all pages, per <see cref="SelectAllCheckboxMode"/>).</summary>
    public Task SelectAllAsync(bool select = true) => SelectDataItemsAsync(SelectAllScope(), select);

    public Task ClearSelectionAsync()
    {
        selected.Clear();
        return AfterSelectionChangeAsync();
    }

    private IEnumerable<TItem> SelectAllScope() =>
        SelectAllCheckboxMode == PBGridSelectAllMode.AllPages ? GetFilteredItems() : pageRows.Where(r => r.Kind == GridRowKind.Data && !r.IsInserted).Select(r => r.Item!);

    /// <summary>true: all selected; false: none; null: some.</summary>
    private bool? SelectAllState()
    {
        var scope = SelectAllScope().ToList();
        if (scope.Count == 0) return false;
        var count = scope.Count(IsSelected);
        return count == 0 ? false : count == scope.Count ? true : null;
    }

    private Task ToggleSelectAllAsync() => SelectAllAsync(SelectAllState() != true);

    private Task ToggleRowSelectionAsync(TItem item) => SelectDataItemAsync(item, !IsSelected(item));

    // ------------------------------------------------------------------------------ focus

    private object? focusedKey;
    private TItem? lastFocusedParam;
    private int? focusRowAfterRender;

    private void SyncFocusFromParameters()
    {
        if (!EqualityComparer<TItem?>.Default.Equals(FocusedDataItem, lastFocusedParam))
            focusedKey = FocusedDataItem is null ? null : KeyOf(FocusedDataItem);
        lastFocusedParam = FocusedDataItem;
    }

    private bool IsFocused(TItem item) => FocusedRowEnabled && focusedKey is not null && Equals(focusedKey, KeyOf(item));

    private async Task SetFocusedAsync(TItem? item)
    {
        var key = item is null ? null : KeyOf(item);
        if (Equals(key, focusedKey)) return;
        focusedKey = key;
        lastFocusedParam = item;
        await FocusedDataItemChanged.InvokeAsync(item);
    }

    /// <summary>The row keyboard focus is on (roving tabindex), as an index into the full row list.</summary>
    private int keyboardRow = -1;

    private int TabIndexOf(GridRow row)
    {
        var first = pageRows.Count > 0 ? pageRows[0].Index : 0;
        var current = keyboardRow >= 0 && pageRows.Any(r => r.Index == keyboardRow) ? keyboardRow : first;
        return row.Index == current ? 0 : -1;
    }

    // ------------------------------------------------------------------------------ row clicks

    private async Task OnRowClickAsync(GridRow row, MouseEventArgs e)
    {
        var item = row.Item!;
        keyboardRow = row.Index;
        if (FocusedRowEnabled) await SetFocusedAsync(item);
        if (AllowSelectRowByClick && SelectionMode != PBGridSelectionMode.None)
        {
            if (SelectionMode == PBGridSelectionMode.Single)
            {
                selected.Clear();
                selected[KeyOf(item)] = item;
            }
            else if (e.ShiftKey && selectionAnchor is int anchor)
            {
                var from = Math.Min(anchor, row.Index);
                var to = Math.Max(anchor, row.Index);
                if (!e.CtrlKey && !e.MetaKey) selected.Clear();
                foreach (var r in allRows.Where(r => r.Kind == GridRowKind.Data && r.Index >= from && r.Index <= to)) selected[KeyOf(r.Item!)] = r.Item!;
            }
            else if (e.CtrlKey || e.MetaKey)
            {
                if (!selected.Remove(KeyOf(item))) selected[KeyOf(item)] = item;
                selectionAnchor = row.Index;
            }
            else
            {
                selected.Clear();
                selected[KeyOf(item)] = item;
                selectionAnchor = row.Index;
            }
            await NotifySelectionAsync();
        }
        await RowClick.InvokeAsync(item);
    }

    private async Task OnRowDoubleClickAsync(GridRow row)
    {
        await RowDoubleClick.InvokeAsync(row.Item!);
        if (CanEditRows && EditMode != PBGridEditMode.EditCell && EditMode != PBGridEditMode.Batch && !row.IsInserted)
            await StartEditDataItemAsync(row.Item!);
    }

    // ------------------------------------------------------------------------------ sorting

    private async Task OnHeaderClickAsync(PBDataGridColumn column, MouseEventArgs e)
    {
        if (!AllowSort || !column.CanSort || suppressHeaderClick)
        {
            suppressHeaderClick = false;
            return;
        }
        if (e.CtrlKey || e.MetaKey)
        {
            SortBy(column.Key, PBGridSortOrder.None, clearOthers: false);
        }
        else
        {
            var next = column.CurrentSortOrder == PBGridSortOrder.Ascending ? PBGridSortOrder.Descending : PBGridSortOrder.Ascending;
            SortBy(column.Key, next, clearOthers: !e.ShiftKey);
        }
        await LayoutChangedAsync();
    }

    private bool suppressHeaderClick;

    /// <summary>Sorts by a column. <paramref name="clearOthers"/> false adds it to the current sort (Shift+click).</summary>
    public void SortBy(string column, PBGridSortOrder order, bool clearOthers = true)
    {
        var target = GetColumn(column);
        if (target is null) return;
        if (target.CurrentGroupIndex >= 0)
        {
            target.CurrentSortOrder = order == PBGridSortOrder.None ? PBGridSortOrder.Ascending : order;
        }
        else
        {
            if (clearOthers)
            {
                foreach (var other in DataColumns.Where(c => c != target && c.CurrentGroupIndex < 0))
                {
                    other.CurrentSortOrder = PBGridSortOrder.None;
                    other.CurrentSortIndex = -1;
                }
            }
            var wasSorted = target.CurrentSortOrder != PBGridSortOrder.None;
            target.CurrentSortOrder = order;
            if (order == PBGridSortOrder.None) target.CurrentSortIndex = -1;
            else if (!wasSorted || clearOthers) target.CurrentSortIndex = clearOthers ? 0 : SortedColumns().Count(c => c != target);
            var index = 0;
            foreach (var sorted in SortedColumns()) sorted.CurrentSortIndex = index++;
        }
        Invalidate();
    }

    public void ClearSort()
    {
        foreach (var column in DataColumns.Where(c => c.CurrentGroupIndex < 0))
        {
            column.CurrentSortOrder = PBGridSortOrder.None;
            column.CurrentSortIndex = -1;
        }
        Invalidate();
    }

    private static string? AriaSort(PBDataGridColumn column) => column.CurrentSortOrder switch
    {
        PBGridSortOrder.Ascending => "ascending",
        PBGridSortOrder.Descending => "descending",
        _ => null,
    };

    // ------------------------------------------------------------------------------ grouping

    /// <summary>Groups by a column at <paramref name="index"/> (appended when -1).</summary>
    public void GroupBy(string column, int index = -1)
    {
        var target = GetColumn(column);
        if (target is null || !target.CanGroup) return;
        var grouped = GroupedColumns().Where(c => c != target).ToList();
        if (index < 0 || index > grouped.Count) index = grouped.Count;
        grouped.Insert(index, target);
        for (var i = 0; i < grouped.Count; i++) grouped[i].CurrentGroupIndex = i;
        if (target.CurrentSortOrder == PBGridSortOrder.None) target.CurrentSortOrder = PBGridSortOrder.Ascending;
        Invalidate();
    }

    public void Ungroup(string column)
    {
        var target = GetColumn(column);
        if (target is null) return;
        target.CurrentGroupIndex = -1;
        target.CurrentSortOrder = PBGridSortOrder.None;
        var index = 0;
        foreach (var grouped in GroupedColumns()) grouped.CurrentGroupIndex = index++;
        Invalidate();
    }

    public void ClearGrouping()
    {
        foreach (var column in GroupedColumns())
        {
            column.CurrentGroupIndex = -1;
            column.CurrentSortOrder = PBGridSortOrder.None;
        }
        Invalidate();
    }

    public void ExpandAllGroups() => SetAllGroups(true);

    public void CollapseAllGroups() => SetAllGroups(false);

    private void SetAllGroups(bool expanded)
    {
        groupExpanded.Clear();
        expandAll = expanded;
        Invalidate();
    }

    /// <summary>Set by Expand/Collapse All: the state of every group without an explicit toggle.</summary>
    private bool? expandAll;

    private void ToggleGroup(GridGroup group)
    {
        groupExpanded[group.Path] = !IsExpanded(group);
        Invalidate();
    }

    // ------------------------------------------------------------------------------ detail rows

    private readonly HashSet<object> expandedDetails = [];
    private readonly HashSet<object> expandedAdaptive = [];

    private bool IsDetailExpanded(TItem item) =>
        DetailRowTemplate is not null && (DetailRowDisplayMode == PBGridDetailRowDisplayMode.Always || expandedDetails.Contains(KeyOf(item)));

    public void ExpandDetailRow(TItem item)
    {
        if (AutoCollapseDetailRow) expandedDetails.Clear();
        expandedDetails.Add(KeyOf(item));
        StateHasChanged();
    }

    public void CollapseDetailRow(TItem item)
    {
        expandedDetails.Remove(KeyOf(item));
        StateHasChanged();
    }

    public void CollapseAllDetailRows()
    {
        expandedDetails.Clear();
        StateHasChanged();
    }

    private void ToggleDetail(TItem item)
    {
        if (expandedDetails.Contains(KeyOf(item))) CollapseDetailRow(item);
        else ExpandDetailRow(item);
    }

    private void ToggleAdaptive(TItem item)
    {
        if (!expandedAdaptive.Remove(KeyOf(item))) expandedAdaptive.Add(KeyOf(item));
    }

    // ------------------------------------------------------------------------------ paging

    private async Task OnPageAsync(PBPageEvent e)
    {
        var sizeChanged = e.PageSize != pageSize;
        pageIndex = e.PageIndex;
        pageSize = e.PageSize;
        lastPageIndexParam = PageIndex;
        dirty = true;
        await PageIndexChanged.InvokeAsync(pageIndex);
        if (sizeChanged) await PageSizeChanged.InvokeAsync(pageSize);
        await LayoutChangedAsync();
    }

    /// <summary>Shows a page (0-based).</summary>
    public async Task GoToPageAsync(int index)
    {
        pageIndex = Math.Max(0, index);
        dirty = true;
        await PageIndexChanged.InvokeAsync(pageIndex);
        StateHasChanged();
    }

    // ------------------------------------------------------------------------------ filtering

    private CancellationTokenSource? filterDebounce;

    private async Task OnFilterRowInputAsync(PBDataGridColumn column, string? text, bool immediate)
    {
        column.FilterRowText = string.IsNullOrEmpty(text) ? null : text;
        filterDebounce?.Cancel();
        if (!immediate)
        {
            var debounce = filterDebounce = new CancellationTokenSource();
            try
            {
                await Task.Delay(350, debounce.Token);
            }
            catch (TaskCanceledException)
            {
                return;
            }
        }
        pageIndex = 0;
        Invalidate();
        await LayoutChangedAsync();
    }

    private async Task SetFilterRowOperatorAsync(PBDataGridColumn column, PBGridFilterOperator op)
    {
        column.FilterRowOp = op;
        pageIndex = 0;
        Invalidate();
        await LayoutChangedAsync();
    }

    private async Task OnSearchInputAsync(ChangeEventArgs e)
    {
        searchText = e.Value?.ToString();
        lastSearchParam = SearchText;
        var debounce = new CancellationTokenSource();
        filterDebounce?.Cancel();
        filterDebounce = debounce;
        try
        {
            await Task.Delay(300, debounce.Token);
        }
        catch (TaskCanceledException)
        {
            return;
        }
        pageIndex = 0;
        Invalidate();
        await SearchTextChanged.InvokeAsync(searchText);
        await LayoutChangedAsync();
    }

    public async Task SetSearchTextAsync(string? text)
    {
        searchText = text;
        pageIndex = 0;
        Invalidate();
        await SearchTextChanged.InvokeAsync(text);
    }

    /// <summary>Replaces the filter criteria (what the filter builder edits); the filter row and menus keep theirs.</summary>
    public async Task SetFilterCriteriaAsync(PBGridFilter? filter)
    {
        filterCriteria = filter;
        lastFilterParam = FilterCriteria;
        filterEnabled = true;
        pageIndex = 0;
        Invalidate();
        await FilterCriteriaChanged.InvokeAsync(filter);
        await LayoutChangedAsync();
    }

    /// <summary>Everything the user filtered by (criteria, filter row and filter menus), as one filter.</summary>
    public PBGridFilter? GetFilterCriteria() => UserFilter();

    /// <summary>Filters one column through its filter menu (null clears it).</summary>
    public void SetFieldFilterValues(string column, IEnumerable<object?>? values)
    {
        var target = GetColumn(column);
        if (target is null) return;
        target.FilterValues = values?.ToList();
        pageIndex = 0;
        Invalidate();
    }

    /// <summary>Clears the filter criteria, the filter row, the filter menus and the search text.</summary>
    public async Task ClearFilterAsync()
    {
        foreach (var column in allColumns)
        {
            column.FilterRowText = null;
            column.FilterValues = null;
        }
        searchText = null;
        filterEnabled = true;
        await SetFilterCriteriaAsync(null);
        await SearchTextChanged.InvokeAsync(null);
    }

    private bool HasColumnFilter(PBDataGridColumn column) =>
        column.FilterValues is not null || RowFilterOf(column) is not null || (filterCriteria?.Fields.Contains(FilterField(column)) ?? false);

    private void ClearColumnFilter(PBDataGridColumn column)
    {
        column.FilterRowText = null;
        column.FilterValues = null;
        pageIndex = 0;
        Invalidate();
    }

    private void ToggleFilterEnabled()
    {
        filterEnabled = !filterEnabled;
        pageIndex = 0;
        Invalidate();
    }

    private bool ShowFilterPanelNow => FilterPanelDisplayMode switch
    {
        PBGridFilterPanelDisplayMode.Always => true,
        PBGridFilterPanelDisplayMode.Auto => activeUserFilter is not null,
        _ => false,
    };

    // ------------------------------------------------------------------------------ popups (context menu, filter menu, operator menu)

    private enum PopupKind { None, Menu, FilterMenu }

    private sealed class FilterMenuValue
    {
        public object? Value { get; init; }
        public required string Text { get; init; }
        public bool Checked { get; set; }
    }

    private PopupKind popupKind;
    private ElementReference popup;
    private bool popupPositioned;
    private double popupX;
    private double popupY;
    private List<PBGridContextMenuItem> menuItems = [];
    private PBDataGridColumn? popupColumn;
    private List<FilterMenuValue> filterMenuValues = [];
    private string filterMenuSearch = "";

    private void OpenPopup(PopupKind kind, MouseEventArgs e)
    {
        popupKind = kind;
        popupX = e.ClientX;
        popupY = e.ClientY;
        popupPositioned = false;
    }

    [JSInvokable]
    public Task ClosePopup() => InvokeAsync(ClosePopupCoreAsync);

    private async Task ClosePopupCoreAsync()
    {
        if (popupKind == PopupKind.None) return;
        var wasPositioned = popupPositioned;
        popupKind = PopupKind.None;
        popupPositioned = false;
        if (wasPositioned) await DesignSystemJs.InvokeVoidAsync(JS, "unposition", popup);
        StateHasChanged();
    }

    private async Task AfterRenderPopupsAsync()
    {
        if (popupKind != PopupKind.None && !popupPositioned)
        {
            popupPositioned = true;
            await DesignSystemJs.InvokeVoidAsync(JS, "positionAtPoint", popup, popupX, popupY, new { dotNet = selfReference, closeMethod = nameof(ClosePopup) });
            await DesignSystemJs.InvokeVoidAsync(JS, "focusFirst", popup, popupKind == PopupKind.Menu ? "[role='menuitem']:not([disabled])" : "input");
        }
    }

    private async Task RunMenuItemAsync(PBGridContextMenuItem item)
    {
        await ClosePopupCoreAsync();
        await item.Action();
        StateHasChanged();
    }

    private async Task OnMenuKeyDownAsync(KeyboardEventArgs e)
    {
        if (e.Key == "Escape") await ClosePopupCoreAsync();
        else if (e.Key is "ArrowDown" or "ArrowUp" or "Home" or "End") await DesignSystemJs.InvokeVoidAsync(JS, "moveFocus", popup, "[role='menuitem']:not([disabled])", e.Key);
    }

    private void OpenOperatorMenu(PBDataGridColumn column, MouseEventArgs e)
    {
        var current = column.FilterRowOp ?? column.DefaultFilterOperator(typeof(TItem));
        menuItems = PBGridFilter.OperatorsFor(column.FieldType(typeof(TItem)))
            .Select(op => new PBGridContextMenuItem(PBGridFilter.OperatorText(op), () => SetFilterRowOperatorAsync(column, op), op == current ? "check" : null))
            .ToList();
        OpenPopup(PopupKind.Menu, e);
    }

    private void OpenFilterMenu(PBDataGridColumn column, MouseEventArgs e)
    {
        popupColumn = column;
        filterMenuSearch = "";
        var field = FilterField(column);
        List<object?> values;
        if (Data is IQueryable<TItem> query && GridField.GetFieldType(typeof(TItem), field) is not null)
            values = GridQueryable.Distinct(query, field, 1000);
        else
            values = (Data ?? []).Where(i => i is not null).Select(i => column.GetValue(i!)).Distinct().Take(1000).ToList();
        values = values.Select(v => v is DateTime d ? d.Date : v).Distinct().OrderBy(v => v, GridValueComparer.Instance).ToList();
        var current = column.FilterValues;
        filterMenuValues = values.Select(v => new FilterMenuValue
        {
            Value = v,
            Text = v is null ? "(Blank)" : column.FormatValue(v),
            Checked = current is null || current.Any(c => PBGridConditionFilter.Same(v, c) || Equals(v, c)),
        }).ToList();
        OpenPopup(PopupKind.FilterMenu, e);
    }

    private IEnumerable<FilterMenuValue> VisibleFilterMenuValues =>
        string.IsNullOrWhiteSpace(filterMenuSearch) ? filterMenuValues : filterMenuValues.Where(v => v.Text.Contains(filterMenuSearch, StringComparison.CurrentCultureIgnoreCase));

    private bool? FilterMenuAllState()
    {
        var visible = VisibleFilterMenuValues.ToList();
        if (visible.Count == 0) return false;
        var count = visible.Count(v => v.Checked);
        return count == 0 ? false : count == visible.Count ? true : null;
    }

    private void ToggleFilterMenuAll()
    {
        var check = FilterMenuAllState() != true;
        foreach (var value in VisibleFilterMenuValues) value.Checked = check;
    }

    private async Task ApplyFilterMenuAsync()
    {
        if (popupColumn is { } column)
        {
            column.FilterValues = filterMenuValues.All(v => v.Checked) ? null : filterMenuValues.Where(v => v.Checked).Select(v => v.Value).ToList();
            pageIndex = 0;
            Invalidate();
        }
        await ClosePopupCoreAsync();
        await LayoutChangedAsync();
    }

    // ------------------------------------------------------------------------------ context menus

    private void OnHeaderContextMenu(PBDataGridColumn column, MouseEventArgs e)
    {
        if (!ContextMenus.HasFlag(PBGridContextMenus.Header)) return;
        var items = new List<PBGridContextMenuItem>();
        if (column.CanSort && AllowSort)
        {
            items.Add(new("Sort Ascending", () => SortAndSaveAsync(column, PBGridSortOrder.Ascending), "arrow_upward") { Disabled = column.CurrentSortOrder == PBGridSortOrder.Ascending });
            items.Add(new("Sort Descending", () => SortAndSaveAsync(column, PBGridSortOrder.Descending), "arrow_downward") { Disabled = column.CurrentSortOrder == PBGridSortOrder.Descending });
            items.Add(new("Clear Sorting", () => SortAndSaveAsync(column, PBGridSortOrder.None)) { Disabled = column.CurrentSortOrder == PBGridSortOrder.None || column.CurrentGroupIndex >= 0 });
        }
        if (column.CanGroup && AllowGroup)
        {
            items.Add(column.CurrentGroupIndex >= 0
                ? new("Ungroup", () => Run(() => Ungroup(column.Key)), "layers_clear") { BeginGroup = true }
                : new("Group by This Column", () => Run(() => GroupBy(column.Key)), "layers") { BeginGroup = true });
            items.Add(new(groupPanelVisible ? "Hide Group Panel" : "Show Group Panel", () => Run(() => groupPanelVisible = !groupPanelVisible)));
        }
        items.Add(new("Hide Column", () => Run(() => SetColumnVisible(column.Key, false)), "visibility_off") { BeginGroup = true, Disabled = VisibleLeaves().Count <= 1 });
        items.Add(new("Column Chooser", () => Run(ShowColumnChooser), "view_column"));
        items.Add(column.CurrentFixedPosition == PBGridFixedPosition.None
            ? new("Fix Column to the Left", () => Run(() => SetColumnFixed(column.Key, PBGridFixedPosition.Left)), "push_pin")
            : new("Unfix Column", () => Run(() => SetColumnFixed(column.Key, PBGridFixedPosition.None)), "push_pin"));
        if (column.CurrentFixedPosition == PBGridFixedPosition.None)
            items.Add(new("Fix Column to the Right", () => Run(() => SetColumnFixed(column.Key, PBGridFixedPosition.Right))));
        if (column.CanFilter)
        {
            items.Add(new("Clear Filter", () => Run(() => ClearColumnFilter(column)), "filter_alt_off") { BeginGroup = true, Disabled = !HasColumnFilter(column) });
            items.Add(new(filterRowVisible ? "Hide Filter Row" : "Show Filter Row", () => Run(() => filterRowVisible = !filterRowVisible)));
        }
        OpenContextMenu(PBGridContextMenuTarget.Header, column, null, items, e);
    }

    private void OnRowContextMenu(GridRow row, MouseEventArgs e)
    {
        if (!ContextMenus.HasFlag(PBGridContextMenus.DataRow)) return;
        var item = row.Item!;
        var items = new List<PBGridContextMenuItem>();
        if (CanEditRows)
        {
            items.Add(new("New Row", StartEditNewRowAsync, "add"));
            items.Add(new("Edit Row", () => StartEditDataItemAsync(item), "edit") { Disabled = row.IsInserted });
            items.Add(new("Delete Row", () => ShowDataItemDeleteConfirmationAsync(item), "delete"));
        }
        if (DetailRowTemplate is not null && DetailRowDisplayMode == PBGridDetailRowDisplayMode.Auto)
        {
            items.Add(IsDetailExpanded(item)
                ? new("Collapse Detail Row", () => Run(() => CollapseDetailRow(item)), "expand_less") { BeginGroup = items.Count > 0 }
                : new("Expand Detail Row", () => Run(() => ExpandDetailRow(item)), "expand_more") { BeginGroup = items.Count > 0 });
        }
        if (SelectionMode != PBGridSelectionMode.None)
        {
            items.Add(new(IsSelected(item) ? "Deselect Row" : "Select Row", () => ToggleRowSelectionAsync(item), "check_box") { BeginGroup = items.Count > 0 });
        }
        if (IsTree)
        {
            var treeRow = allRows.FirstOrDefault(r => r.Kind == GridRowKind.Data && Equals(KeyOf(r.Item!), KeyOf(item)));
            if (CanEditRows && !row.IsInserted) items.Insert(Math.Min(1, items.Count), new("New Child Row", () => StartEditNewChildRowAsync(item), "subdirectory_arrow_right"));
            if (treeRow is { TreeHasChildren: true })
            {
                items.Add(treeRow.TreeExpanded
                    ? new("Collapse", () => CollapseRowAsync(item), "expand_less") { BeginGroup = true }
                    : new("Expand", () => ExpandRowAsync(item), "expand_more") { BeginGroup = true });
            }
            items.Add(new("Expand All", () => Run(ExpandAllRows), "unfold_more") { BeginGroup = treeRow is not { TreeHasChildren: true } });
            items.Add(new("Collapse All", () => Run(CollapseAllRows), "unfold_less"));
        }
        if (groupedColumns.Count > 0)
        {
            items.Add(new("Expand All Groups", () => Run(ExpandAllGroups), "unfold_more") { BeginGroup = true });
            items.Add(new("Collapse All Groups", () => Run(CollapseAllGroups), "unfold_less"));
        }
        OpenContextMenu(PBGridContextMenuTarget.DataRow, null, item, items, e);
    }

    private void OnGroupPanelContextMenu(MouseEventArgs e)
    {
        if (!ContextMenus.HasFlag(PBGridContextMenus.GroupPanel)) return;
        var items = new List<PBGridContextMenuItem>
        {
            new("Expand All", () => Run(ExpandAllGroups), "unfold_more") { Disabled = groupedColumns.Count == 0 },
            new("Collapse All", () => Run(CollapseAllGroups), "unfold_less") { Disabled = groupedColumns.Count == 0 },
            new("Clear Grouping", () => Run(ClearGrouping), "layers_clear") { BeginGroup = true, Disabled = groupedColumns.Count == 0 },
            new("Hide Group Panel", () => Run(() => groupPanelVisible = false)),
        };
        OpenContextMenu(PBGridContextMenuTarget.GroupPanel, null, null, items, e);
    }

    private void OnFooterContextMenu(PBDataGridColumn column, MouseEventArgs e)
    {
        if (!ContextMenus.HasFlag(PBGridContextMenus.Footer) || !column.IsDataColumn) return;
        var numeric = GridField.IsNumeric(column.FieldType(typeof(TItem)));
        var types = numeric
            ? new[] { PBGridSummaryType.Count, PBGridSummaryType.Sum, PBGridSummaryType.Min, PBGridSummaryType.Max, PBGridSummaryType.Average }
            : new[] { PBGridSummaryType.Count, PBGridSummaryType.Min, PBGridSummaryType.Max };
        var field = FilterField(column);
        var items = types.Select(type =>
        {
            var on = userSummaries.Any(s => s.FieldName == field && s.Type == type);
            return new PBGridContextMenuItem(type == PBGridSummaryType.Average ? "Average" : type.ToString(), () => Run(() => ToggleUserSummary(field, column.Key, type)), on ? "check" : null);
        }).ToList();
        items.Add(new("Clear Summary", () => Run(() => { userSummaries.RemoveAll(s => s.FieldName == field); Invalidate(); }), "clear") { BeginGroup = true, Disabled = !userSummaries.Any(s => s.FieldName == field) });
        OpenContextMenu(PBGridContextMenuTarget.Footer, column, null, items, e);
    }

    private void ToggleUserSummary(string field, string columnKey, PBGridSummaryType type)
    {
        var existing = userSummaries.FindIndex(s => s.FieldName == field && s.Type == type);
        if (existing >= 0) userSummaries.RemoveAt(existing);
        else userSummaries.Add(new SummaryDef(type, field, columnKey, null, null, null));
        Invalidate();
    }

    private void OpenContextMenu(PBGridContextMenuTarget target, PBDataGridColumn? column, object? item, List<PBGridContextMenuItem> items, MouseEventArgs e)
    {
        var args = new PBGridContextMenuEventArgs(target, column, item, items);
        CustomizeContextMenu?.Invoke(args);
        if (args.Items.Count == 0) return;
        menuItems = args.Items;
        OpenPopup(PopupKind.Menu, e);
    }

    private async Task SortAndSaveAsync(PBDataGridColumn column, PBGridSortOrder order)
    {
        SortBy(column.Key, order, clearOthers: true);
        await LayoutChangedAsync();
    }

    private async Task Run(Action action)
    {
        action();
        Invalidate();
        await LayoutChangedAsync();
    }

    // ------------------------------------------------------------------------------ columns: visibility, order, fixing, widths

    public void SetColumnVisible(string column, bool visible)
    {
        if (GetColumn(column) is { } target)
        {
            target.CurrentVisible = visible;
            Invalidate();
        }
    }

    public void SetColumnFixed(string column, PBGridFixedPosition position)
    {
        if (GetColumn(column) is { } target)
        {
            target.CurrentFixedPosition = position;
            Invalidate();
        }
    }

    public void SetColumnWidth(string column, string? width)
    {
        if (GetColumn(column) is { } target)
        {
            target.CurrentWidth = width;
            Invalidate();
        }
    }

    /// <summary>Moves a column before or after another column with the same parent band.</summary>
    public void MoveColumn(string column, string target, bool after)
    {
        var moving = GetColumn(column);
        var anchor = GetColumn(target);
        if (moving is null || anchor is null || moving == anchor) return;
        // Move the outermost columns that share a parent (a column dropped on another band's child moves its own band).
        while (moving.Band != anchor.Band && anchor.Band is not null && !IsInside(moving, anchor.Band)) anchor = anchor.Band;
        while (moving.Band != anchor.Band && moving.Band is not null) moving = moving.Band;
        if (moving.Band != anchor.Band || moving == anchor) return;
        var siblings = allColumns.Where(c => c.Band == moving.Band && c != moving).OrderBy(c => c.CurrentVisibleIndex).ThenBy(c => c.Order).ToList();
        var position = siblings.IndexOf(anchor) + (after ? 1 : 0);
        siblings.Insert(position, moving);
        for (var i = 0; i < siblings.Count; i++) siblings[i].CurrentVisibleIndex = i;
        Invalidate();
    }

    private static bool IsInside(PBDataGridColumn column, PBDataGridBandColumn band)
    {
        for (var b = column.Band; b is not null; b = b.Band)
            if (b == band) return true;
        return false;
    }

    [JSInvokable]
    public async Task OnColumnsResized(string[] keys, double[] widths)
    {
        for (var i = 0; i < keys.Length && i < widths.Length; i++)
        {
            if (GetColumn(keys[i]) is { } column) column.CurrentWidth = Math.Round(widths[i]).ToString(CultureInfo.InvariantCulture) + "px";
        }
        suppressHeaderClick = true;
        _ = Task.Delay(300).ContinueWith(_ => suppressHeaderClick = false, TaskScheduler.Default);
        Invalidate();
        await LayoutChangedAsync();
    }

    /// <summary>Column header dropped: on another header (reorder), the group panel (group) or the header row (ungroup).</summary>
    [JSInvokable]
    public async Task OnColumnDrop(string key, string? targetKey, string position, int groupIndex)
    {
        switch (position)
        {
            case "group":
                if (AllowGroup) GroupBy(key, groupIndex);
                break;
            case "ungroup":
                Ungroup(key);
                break;
            default:
                if (targetKey is not null)
                {
                    var column = GetColumn(key);
                    if (column is not null && column.CurrentGroupIndex >= 0 && !column.CurrentVisible) Ungroup(key);
                    if (AllowColumnReorder) MoveColumn(key, targetKey, position == "after");
                }
                else Ungroup(key);
                break;
        }
        suppressHeaderClick = false;
        await LayoutChangedAsync();
    }

    /// <summary>Fits every column to its content.</summary>
    public async Task AutoFitColumnWidthsAsync()
    {
        var widths = await DesignSystemJs.InvokeAsync<Dictionary<string, double>>(JS, "gridMeasureContent", root);
        if (widths is null) return;
        foreach (var (key, width) in widths)
        {
            if (GetColumn(key) is { } column) column.CurrentWidth = Math.Ceiling(width).ToString(CultureInfo.InvariantCulture) + "px";
        }
        Invalidate();
        await LayoutChangedAsync();
    }

    // ------------------------------------------------------------------------------ adaptivity

    private double gridWidth;

    [JSInvokable]
    public Task OnGridResized(double width) => InvokeAsync(() =>
    {
        if (Math.Abs(width - gridWidth) < 1) return;
        gridWidth = width;
        ApplyAdaptivity();
        StateHasChanged();
    });

    private void ApplyAdaptivity()
    {
        foreach (var column in allColumns) column.AdaptiveHidden = false;
        if (!AdaptivityEnabled || gridWidth <= 0) return;
        var leaves = VisibleLeaves();
        double Needed(IEnumerable<PBDataGridColumn> columns) => columns.Sum(c => PixelWidth(c) ?? c.MinWidth) + 48 + groupedColumns.Count * 32;
        var candidates = leaves.Where(c => c.AdaptivePriority > 0 && c.IsDataColumn)
            .OrderByDescending(c => c.AdaptivePriority).ThenByDescending(c => leaves.IndexOf(c)).ToList();
        foreach (var column in candidates)
        {
            if (Needed(leaves.Where(c => !c.AdaptiveHidden)) <= gridWidth) break;
            column.AdaptiveHidden = true;
        }
    }

    private static double? PixelWidth(PBDataGridColumn column) =>
        column.CurrentWidth is { } w && w.EndsWith("px", StringComparison.Ordinal) && double.TryParse(w[..^2], NumberStyles.Float, CultureInfo.InvariantCulture, out var px) ? px : null;

    private List<PBDataGridColumn> AdaptiveHiddenColumns() => OrderedLeaves().Where(c => c.AdaptiveHidden && c.CurrentVisible).ToList();

    // ------------------------------------------------------------------------------ keyboard

    private async Task OnBodyKeyDownAsync(KeyboardEventArgs e)
    {
        if (editModel is not null || pageRows.Count == 0) return;
        var rows = pageRows;
        var currentPosition = rows.FindIndex(r => r.Index == keyboardRow);
        if (currentPosition < 0) currentPosition = 0;
        var row = rows[currentPosition];

        async Task MoveTo(int position)
        {
            position = Math.Clamp(position, 0, rows.Count - 1);
            keyboardRow = rows[position].Index;
            focusRowAfterRender = keyboardRow;
            if (FocusedRowEnabled && rows[position].Item is { } item) await SetFocusedAsync(item);
        }

        switch (e.Key)
        {
            case "ArrowDown" when (e.CtrlKey || e.MetaKey) && AllowDragRows && row.Item is not null:
            case "ArrowUp" when (e.CtrlKey || e.MetaKey) && AllowDragRows && row.Item is not null:
                await MoveRowByKeyboardAsync(row, e.Key == "ArrowDown");
                break;
            case "ArrowDown":
                await MoveTo(currentPosition + 1);
                break;
            case "ArrowUp":
                await MoveTo(currentPosition - 1);
                break;
            case "Home":
                await MoveTo(0);
                break;
            case "End":
                await MoveTo(rows.Count - 1);
                break;
            case "PageDown" when PagingActive:
                await GoToPageAsync(pageIndex + 1);
                keyboardRow = -1;
                break;
            case "PageUp" when PagingActive && pageIndex > 0:
                await GoToPageAsync(pageIndex - 1);
                keyboardRow = -1;
                break;
            // Tree mode (treegrid): Right expands, Left collapses or moves to the parent row.
            case "ArrowRight" when row.Kind == GridRowKind.Data && IsTree && row.TreeHasChildren && !row.TreeExpanded:
            case "ArrowLeft" when row.Kind == GridRowKind.Data && IsTree && row.TreeExpanded:
                await ToggleTreeRowAsync(row);
                focusRowAfterRender = row.Index;
                break;
            case "ArrowRight" when row.Kind == GridRowKind.Data && IsTree && row.TreeExpanded:
                if (currentPosition + 1 < rows.Count && rows[currentPosition + 1].TreeLevel > row.TreeLevel) await MoveTo(currentPosition + 1);
                break;
            case "ArrowLeft" when row.Kind == GridRowKind.Data && IsTree && row.TreeLevel > 0:
                var parentPosition = rows.FindLastIndex(currentPosition, r => r.Kind == GridRowKind.Data && r.TreeLevel < row.TreeLevel);
                if (parentPosition >= 0) await MoveTo(parentPosition);
                break;
            case "ArrowRight" or "ArrowLeft" when row.Kind == GridRowKind.Group:
                if (IsExpanded(row.Group!) != (e.Key == "ArrowRight")) ToggleGroup(row.Group!);
                focusRowAfterRender = row.Index;
                break;
            case "ArrowRight" or "ArrowLeft" when row.Kind == GridRowKind.Data && DetailRowTemplate is not null && DetailRowDisplayMode == PBGridDetailRowDisplayMode.Auto:
                if (e.Key == "ArrowRight") ExpandDetailRow(row.Item!);
                else CollapseDetailRow(row.Item!);
                focusRowAfterRender = row.Index;
                break;
            case "Enter" when row.Kind == GridRowKind.Group:
                ToggleGroup(row.Group!);
                focusRowAfterRender = row.Index;
                break;
            case "Enter" or "F2" when row.Kind == GridRowKind.Data && CanEditRows && EditMode is not PBGridEditMode.Batch:
                await StartEditDataItemAsync(row.Item!);
                break;
            case " " when row.Kind == GridRowKind.Data && SelectionMode != PBGridSelectionMode.None:
                await ToggleRowSelectionAsync(row.Item!);
                focusRowAfterRender = row.Index;
                break;
            case "Delete" when row.Kind == GridRowKind.Data && CanEditRows:
                await ShowDataItemDeleteConfirmationAsync(row.Item!);
                break;
        }
    }

    // ------------------------------------------------------------------------------ layout

    private async Task LayoutChangedAsync()
    {
        StateHasChanged();
        if (LayoutAutoSaving.HasDelegate) await LayoutAutoSaving.InvokeAsync(GetLayout());
    }

    /// <summary>The user's current state: page, search, and every column's visibility, order, width, sort, group and filters.</summary>
    public PBGridLayout GetLayout() => new()
    {
        PageIndex = pageIndex,
        PageSize = pageSize,
        SearchText = searchText,
        Columns = allColumns.Select(c => new PBGridColumnLayout
        {
            Key = c.Key,
            Visible = c.CurrentVisible,
            VisibleIndex = c.CurrentVisibleIndex,
            Width = c.CurrentWidth,
            SortOrder = c.CurrentSortOrder,
            SortIndex = c.CurrentSortIndex,
            GroupIndex = c.CurrentGroupIndex,
            FilterRowValue = c.FilterRowText,
            FilterRowOperator = c.FilterRowOp ?? c.DefaultFilterOperator(typeof(TItem)),
            FilterValues = c.FilterValues?.Select(v => v is IFormattable f ? f.ToString(null, CultureInfo.InvariantCulture) : v?.ToString() ?? "\0").ToList(),
        }).ToList(),
    };

    public void ApplyLayout(PBGridLayout layout)
    {
        ApplyLayoutCore(layout);
        StateHasChanged();
    }

    private void ApplyLayoutCore(PBGridLayout layout)
    {
        pageIndex = layout.PageIndex;
        if (layout.PageSize > 0) pageSize = layout.PageSize;
        searchText = layout.SearchText;
        foreach (var state in layout.Columns)
        {
            var column = allColumns.FirstOrDefault(c => c.Key == state.Key);
            if (column is null) continue;
            column.CurrentVisible = state.Visible;
            column.CurrentVisibleIndex = state.VisibleIndex;
            column.CurrentWidth = state.Width;
            column.CurrentSortOrder = state.SortOrder;
            column.CurrentSortIndex = state.SortIndex;
            column.CurrentGroupIndex = state.GroupIndex;
            column.FilterRowText = state.FilterRowValue;
            column.FilterRowOp = state.FilterRowOperator;
            var type = column.FieldType(typeof(TItem)) ?? typeof(string);
            column.FilterValues = state.FilterValues?.Select(v => v == "\0" ? null : GridField.TryConvertTo(v, type, out var value) ? value : v).ToList();
        }
        dirty = true;
    }
}
