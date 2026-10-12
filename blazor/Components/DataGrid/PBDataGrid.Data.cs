using System.Globalization;
using Microsoft.AspNetCore.Components.Web.Virtualization;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>A summary as the grid computes it (declared summary items and the footer menu's own).</summary>
internal sealed record SummaryDef(PBGridSummaryType Type, string? FieldName, string? FooterColumn, string? DisplayText, string? ValueFormat, string? Name)
{
    public static SummaryDef From(PBDataGridSummaryItem item) =>
        new(item.SummaryType, item.FieldName, item.FooterColumnName, item.DisplayText, item.ValueDisplayFormat, item.Name);

    public string TypeText => Type switch
    {
        PBGridSummaryType.Average => "Avg",
        PBGridSummaryType.Custom => Name ?? "Custom",
        _ => Type.ToString(),
    };
}

/// <summary>Orders cell values: nulls first, text by culture ignoring case, otherwise IComparable.</summary>
internal sealed class GridValueComparer : IComparer<object?>
{
    public static readonly GridValueComparer Instance = new();

    public int Compare(object? x, object? y)
    {
        if (ReferenceEquals(x, y)) return 0;
        if (x is null) return -1;
        if (y is null) return 1;
        if (x is string a && y is string b) return string.Compare(a, b, StringComparison.CurrentCultureIgnoreCase);
        if (x.GetType() == y.GetType() && x is IComparable comparable) return comparable.CompareTo(y);
        if (GridField.IsNumeric(x.GetType()) && GridField.IsNumeric(y.GetType()))
            return Convert.ToDecimal(x, CultureInfo.InvariantCulture).CompareTo(Convert.ToDecimal(y, CultureInfo.InvariantCulture));
        return string.Compare(x.ToString(), y.ToString(), StringComparison.CurrentCultureIgnoreCase);
    }
}

public partial class PBDataGrid<TItem>
{
    private enum GridRowKind { Data, Group, GroupFooter }

    private sealed class GridGroup
    {
        public required PBDataGridColumn Column { get; init; }
        public object? Key { get; init; }
        public required string Text { get; init; }
        public required List<TItem> Items { get; init; }
        public List<GridGroup>? Children { get; set; }
        public required string Path { get; init; }
        public int Level { get; init; }
        public List<PBGridSummaryValue> RowSummaries { get; } = [];
        public List<PBGridSummaryValue> FooterSummaries { get; } = [];
    }

    private sealed class GridRow
    {
        public GridRowKind Kind { get; init; }
        public TItem? Item { get; init; }
        public GridGroup? Group { get; init; }

        /// <summary>Indent level: a group row's nesting, or the number of group levels for data rows.</summary>
        public int Level { get; init; }

        /// <summary>Position in the full row list (data-row attribute, keyboard and drag and drop).</summary>
        public int Index { get; set; }

        /// <summary>Data rows: position among data rows (alternating style).</summary>
        public int DataIndex { get; init; }

        /// <summary>A batch-mode row that is not in the data yet.</summary>
        public bool IsInserted { get; init; }

        /// <summary>Tree mode: the node's depth (0 for root nodes).</summary>
        public int TreeLevel { get; init; }

        /// <summary>Tree mode: the node has (or may load) children, so it shows an expand button.</summary>
        public bool TreeHasChildren { get; init; }

        public bool TreeExpanded { get; init; }

        /// <summary>Tree mode: the node's children are being loaded on demand.</summary>
        public bool TreeLoading { get; init; }
    }

    private List<GridRow> allRows = [];
    private List<GridRow> pageRows = [];
    private List<TItem> filteredItems = [];
    private IQueryable<TItem>? filteredQuery;
    private bool serverMode;
    private int totalCount;
    private int rowCount;
    private List<PBGridSummaryValue> totalSummaryValues = [];
    private readonly Dictionary<string, bool> groupExpanded = [];
    private List<PBDataGridColumn> groupedColumns = [];
    private PBGridFilter? activeUserFilter;

    private PBGridDataResult<TItem>? providerResult;
    private string? providerSignature;
    private string? loadingSignature;
    private bool loading;
    private CancellationTokenSource? providerCancellation;
    private Virtualize<GridRow>? virtualizer;
    private bool refreshVirtualizer;
    private readonly Dictionary<int, TItem> providedRows = [];

    private bool PagingActive => ShowPager && pageSize > 0 && !VirtualScrollingEnabled;
    private bool UsesItemsProvider => VirtualScrollingEnabled && (DataProvider is not null || serverMode);

    /// <summary>The filter row, filter menus and filter criteria combined (what the filter panel shows).</summary>
    private PBGridFilter? UserFilter()
    {
        var parts = new List<PBGridFilter?> { filterCriteria };
        foreach (var column in DataColumns.Where(c => c.CanFilter))
        {
            parts.Add(RowFilterOf(column));
            if (column.FilterValues is not null) parts.Add(PBGridFilter.In(FilterField(column), column.FilterValues));
        }
        return PBGridFilter.And([.. parts]);
    }

    private PBGridFilter? RowFilterOf(PBDataGridColumn column)
    {
        var op = column.FilterRowOp ?? column.DefaultFilterOperator(typeof(TItem));
        if (op is PBGridFilterOperator.IsBlank or PBGridFilterOperator.IsNotBlank) return PBGridFilter.Condition(FilterField(column), op);
        return string.IsNullOrEmpty(column.FilterRowText) ? null : PBGridFilter.Condition(FilterField(column), op, column.FilterRowText);
    }

    private PBGridFilter? SearchFilter()
    {
        if (string.IsNullOrWhiteSpace(searchText)) return null;
        var fields = DataColumns.Where(c => c.SearchEnabled && c.CurrentVisible)
            .Select(c => (FilterField(c), c.FieldType(typeof(TItem)) ?? typeof(string))).ToList();
        return new GridSearchFilter(searchText.Trim(), fields);
    }

    private PBGridFilter? EffectiveFilter() => PBGridFilter.And(filterEnabled ? activeUserFilter : null, SearchFilter());

    private List<(PBDataGridColumn Column, bool Descending, bool Group)> SortKeys()
    {
        var keys = groupedColumns.Select(c => (c, c.CurrentSortOrder == PBGridSortOrder.Descending, true)).ToList();
        if (AllowSort) keys.AddRange(SortedColumns().Select(c => (c, c.CurrentSortOrder == PBGridSortOrder.Descending, false)));
        return keys;
    }

    /// <summary>Rebuilds rows, groups, paging and summaries when something changed. Runs at render time.</summary>
    private void EnsureData()
    {
        if (!dirty) return;
        dirty = false;
        groupedColumns = DataProvider is null && TreeConfig is null ? GroupedColumns() : [];
        activeUserFilter = UserFilter();
        var filter = EffectiveFilter();
        var sortKeys = SortKeys();
        allRows = [];
        dataRowCounter = 0;
        providedRows.Clear();

        if (TreeConfig is { } tree)
        {
            groupedColumns = [];
            BuildTree(tree, filter, sortKeys);
            return;
        }

        if (DataProvider is not null)
        {
            BuildFromProvider(filter, sortKeys);
            return;
        }

        var source = Data ?? [];
        var unbound = (filter?.Fields ?? []).Concat(sortKeys.Select(k => FilterField(k.Column)))
            .Any(f => GridField.GetFieldType(typeof(TItem), f) is null);
        serverMode = source is IQueryable<TItem> && groupedColumns.Count == 0 && !unbound && batchInserted.Count == 0;

        if (serverMode)
        {
            var query = (IQueryable<TItem>)source;
            if (filter?.ToExpression<TItem>() is { } predicate) query = query.Where(predicate);
            query = GridQueryable.Sort(query, sortKeys.Select(k => (FilterField(k.Column), k.Descending ? PBGridSortOrder.Descending : PBGridSortOrder.Ascending)));
            filteredQuery = query;
            filteredItems = [];
            totalCount = query.Count();
            rowCount = totalCount;
            ClampPage();
            if (VirtualScrollingEnabled)
            {
                refreshVirtualizer = true;
            }
            else
            {
                var page = PagingActive ? query.Skip(pageIndex * pageSize).Take(pageSize) : query;
                var index = 0;
                foreach (var item in page.ToList())
                {
                    allRows.Add(new GridRow { Kind = GridRowKind.Data, Item = item, Index = index, DataIndex = index });
                    index++;
                }
            }
            pageRows = allRows;
            totalSummaryValues = TotalSummaryDefs().Select(d => SummaryOverQuery(d, query)).ToList();
            return;
        }

        filteredQuery = null;
        IEnumerable<TItem> items = source;
        if (filter is not null) items = items.Where(item => item is not null && filter.Matches(item, this));
        var list = Sort(items, sortKeys).ToList();
        filteredItems = list;
        totalCount = list.Count;

        foreach (var inserted in batchInserted) AddDataRow(inserted, groupedColumns.Count, inserted: true);
        if (groupedColumns.Count > 0)
        {
            foreach (var group in BuildGroups(list, 0, "")) AddGroupRows(group);
        }
        else
        {
            foreach (var item in list) AddDataRow(item, 0);
        }

        rowCount = allRows.Count;
        ClampPage();
        pageRows = PagingActive ? allRows.Skip(pageIndex * pageSize).Take(pageSize).ToList() : allRows;
        totalSummaryValues = TotalSummaryDefs().Select(d => Summary(d, list, null, inGroupRow: false)).ToList();
    }

    private int dataRowCounter;

    private void AddDataRow(TItem item, int level, bool inserted = false)
    {
        allRows.Add(new GridRow { Kind = GridRowKind.Data, Item = item, Level = level, Index = allRows.Count, DataIndex = dataRowCounter++, IsInserted = inserted });
    }

    private void ClampPage()
    {
        if (!PagingActive) return;
        var pageCount = Math.Max(1, (int)Math.Ceiling(rowCount / (double)pageSize));
        if (pageIndex >= pageCount) pageIndex = pageCount - 1;
        if (pageIndex < 0) pageIndex = 0;
    }

    private void BuildFromProvider(PBGridFilter? filter, List<(PBDataGridColumn Column, bool Descending, bool Group)> sortKeys)
    {
        serverMode = true;
        filteredQuery = null;
        filteredItems = [];
        if (VirtualScrollingEnabled)
        {
            refreshVirtualizer = true;
            pageRows = allRows;
            totalSummaryValues = [];
            return;
        }
        var request = new PBGridDataRequest(
            PagingActive ? pageIndex * pageSize : 0,
            PagingActive ? pageSize : int.MaxValue,
            sortKeys.Select(k => (FilterField(k.Column), k.Descending ? PBGridSortOrder.Descending : PBGridSortOrder.Ascending)).ToList(),
            filterEnabled ? activeUserFilter : null,
            searchText);
        var signature = $"{request.Skip}|{request.Take}|{string.Join(",", request.Sort)}|{filter?.ToDisplayText(f => f)}|{searchText}";
        if (providerResult is not null && signature == providerSignature)
        {
            var index = 0;
            foreach (var item in providerResult.Items)
            {
                allRows.Add(new GridRow { Kind = GridRowKind.Data, Item = item, Index = index, DataIndex = index });
                index++;
            }
            totalCount = providerResult.TotalCount;
            rowCount = totalCount;
            pageRows = allRows;
            totalSummaryValues = TotalSummaryDefs().Where(d => d.Type == PBGridSummaryType.Count)
                .Select(d => new PBGridSummaryValue(d.Type, d.FieldName, d.Name, totalCount, SummaryText(d, totalCount, false))).ToList();
            return;
        }
        pageRows = allRows;
        if (signature != loadingSignature) _ = InvokeAsync(() => LoadFromProviderAsync(request, signature));
    }

    private async Task LoadFromProviderAsync(PBGridDataRequest request, string signature)
    {
        providerCancellation?.Cancel();
        providerCancellation?.Dispose();
        var cancellation = providerCancellation = new CancellationTokenSource();
        loadingSignature = signature;
        loading = true;
        StateHasChanged();
        try
        {
            var result = await DataProvider!(request, cancellation.Token);
            if (cancellation.IsCancellationRequested) return;
            providerResult = result;
            providerSignature = signature;
            if (PagingActive && result.TotalCount > 0 && request.Skip >= result.TotalCount)
            {
                pageIndex = Math.Max(0, (int)Math.Ceiling(result.TotalCount / (double)pageSize) - 1);
            }
        }
        catch (OperationCanceledException)
        {
            return;
        }
        finally
        {
            if (!cancellation.IsCancellationRequested)
            {
                loading = false;
                loadingSignature = null;
            }
        }
        dirty = true;
        StateHasChanged();
    }

    private async ValueTask<ItemsProviderResult<GridRow>> ProvideRowsAsync(ItemsProviderRequest request)
    {
        List<TItem> items;
        int total;
        if (DataProvider is not null)
        {
            var sort = SortKeys().Select(k => (FilterField(k.Column), k.Descending ? PBGridSortOrder.Descending : PBGridSortOrder.Ascending)).ToList();
            var result = await DataProvider(new PBGridDataRequest(request.StartIndex, request.Count, sort, filterEnabled ? UserFilter() : null, searchText), request.CancellationToken);
            items = [.. result.Items];
            total = result.TotalCount;
            if (total != totalCount)
            {
                totalCount = total;
                rowCount = total;
                _ = InvokeAsync(StateHasChanged);
            }
        }
        else
        {
            var query = filteredQuery ?? Enumerable.Empty<TItem>().AsQueryable();
            items = query.Skip(request.StartIndex).Take(request.Count).ToList();
            total = totalCount;
        }
        var rows = new List<GridRow>(items.Count);
        for (var i = 0; i < items.Count; i++)
        {
            var index = request.StartIndex + i;
            providedRows[index] = items[i];
            rows.Add(new GridRow { Kind = GridRowKind.Data, Item = items[i], Index = index, DataIndex = index });
        }
        return new ItemsProviderResult<GridRow>(rows, total);
    }

    private TItem? ItemAtRow(int index)
    {
        if (index >= 0 && index < allRows.Count && allRows[index].Item is { } item) return item;
        return providedRows.TryGetValue(index, out var provided) ? provided : default;
    }

    // ------------------------------------------------------------------------------ sorting and grouping

    private IEnumerable<TItem> Sort(IEnumerable<TItem> items, List<(PBDataGridColumn Column, bool Descending, bool Group)> keys)
    {
        IOrderedEnumerable<TItem>? ordered = null;
        foreach (var (column, descending, group) in keys)
        {
            Func<TItem, object?> key = group ? item => GroupKey(column, item) : item => column.GetValue(item!);
            ordered = ordered is null
                ? descending ? items.OrderByDescending(key, GridValueComparer.Instance) : items.OrderBy(key, GridValueComparer.Instance)
                : descending ? ordered.ThenByDescending(key, GridValueComparer.Instance) : ordered.ThenBy(key, GridValueComparer.Instance);
        }
        return ordered ?? items;
    }

    private static object? GroupKey(PBDataGridColumn column, TItem item)
    {
        var value = column.GetValue(item!);
        return column.GroupInterval switch
        {
            PBGridGroupInterval.Alphabetical => value?.ToString() is { Length: > 0 } s ? char.ToUpper(s[0], CultureInfo.CurrentCulture).ToString() : "",
            PBGridGroupInterval.Date => value switch { DateTime d => d.Date, DateTimeOffset d => d.Date, _ => value },
            PBGridGroupInterval.Month => value switch { DateTime d => new DateTime(d.Year, d.Month, 1), DateOnly d => new DateTime(d.Year, d.Month, 1), _ => value },
            PBGridGroupInterval.Year => value switch { DateTime d => d.Year, DateOnly d => d.Year, DateTimeOffset d => d.Year, _ => value },
            PBGridGroupInterval.Custom => column.CustomGroupKey is null ? value : column.CustomGroupKey(value),
            _ => value,
        };
    }

    private static string GroupText(PBDataGridColumn column, object? key) => column.GroupInterval switch
    {
        PBGridGroupInterval.Month when key is DateTime d => d.ToString("MMMM yyyy", CultureInfo.CurrentCulture),
        PBGridGroupInterval.Year or PBGridGroupInterval.Alphabetical or PBGridGroupInterval.Custom => Convert.ToString(key, CultureInfo.CurrentCulture) ?? "",
        PBGridGroupInterval.Date when key is DateTime d => d.ToString("D", CultureInfo.CurrentCulture),
        _ => key is null ? "(Blank)" : column.FormatValue(key),
    };

    private List<GridGroup> BuildGroups(List<TItem> items, int level, string parentPath)
    {
        var column = groupedColumns[level];
        var groups = new List<GridGroup>();
        var rowDefs = GroupRowSummaryDefs();
        var footerDefs = GroupFooterSummaryDefs();
        var start = 0;
        while (start < items.Count)
        {
            var key = GroupKey(column, items[start]);
            var end = start + 1;
            while (end < items.Count && Equals(GroupKey(column, items[end]), key)) end++;
            var groupItems = items.GetRange(start, end - start);
            var group = new GridGroup
            {
                Column = column,
                Key = key,
                Text = GroupText(column, key),
                Items = groupItems,
                Path = $"{parentPath}/{column.Key}={key}",
                Level = level,
            };
            group.RowSummaries.AddRange(rowDefs.Select(d => Summary(d, groupItems, key, inGroupRow: true)));
            group.FooterSummaries.AddRange(footerDefs.Select(d => Summary(d, groupItems, key, inGroupRow: false)));
            if (level + 1 < groupedColumns.Count) group.Children = BuildGroups(groupItems, level + 1, group.Path);
            groups.Add(group);
            start = end;
        }
        return groups;
    }

    private bool IsExpanded(GridGroup group) => groupExpanded.TryGetValue(group.Path, out var expanded) ? expanded : expandAll ?? AutoExpandAllGroups;

    private bool ShowGroupFooters => GroupFooterDisplayMode switch
    {
        PBGridGroupFooterDisplayMode.Always => true,
        PBGridGroupFooterDisplayMode.Never => false,
        _ => groupSummaryItems.Any(s => s.Visible && s.FooterColumnName is not null),
    };

    private void AddGroupRows(GridGroup group)
    {
        allRows.Add(new GridRow { Kind = GridRowKind.Group, Group = group, Level = group.Level, Index = allRows.Count });
        if (!IsExpanded(group)) return;
        if (group.Children is not null)
        {
            foreach (var child in group.Children) AddGroupRows(child);
        }
        else
        {
            foreach (var item in group.Items) AddDataRow(item, groupedColumns.Count);
        }
        if (ShowGroupFooters) allRows.Add(new GridRow { Kind = GridRowKind.GroupFooter, Group = group, Level = group.Level, Index = allRows.Count });
    }

    // ------------------------------------------------------------------------------ summaries

    private IEnumerable<SummaryDef> TotalSummaryDefs() =>
        totalSummaryItems.Where(s => s.Visible).Select(SummaryDef.From).Concat(userSummaries);

    private List<SummaryDef> GroupRowSummaryDefs() =>
        groupSummaryItems.Where(s => s.Visible && (s.FooterColumnName is null || !ShowGroupFooters)).Select(SummaryDef.From).ToList();

    private List<SummaryDef> GroupFooterSummaryDefs() =>
        ShowGroupFooters ? groupSummaryItems.Where(s => s.Visible && s.FooterColumnName is not null).Select(SummaryDef.From).ToList() : [];

    private PBGridSummaryValue Summary(SummaryDef def, IReadOnlyList<TItem> items, object? groupKey, bool inGroupRow)
    {
        var column = def.FieldName is null ? null : FieldColumn(def.FieldName);
        object? value = null;
        switch (def.Type)
        {
            case PBGridSummaryType.Count:
                value = items.Count;
                break;
            case PBGridSummaryType.Custom:
                if (CustomSummary is not null)
                {
                    var args = new PBGridCustomSummaryEventArgs(def.Name, def.FieldName, items.Cast<object>().ToList(), groupKey);
                    CustomSummary(args);
                    value = args.Value;
                }
                break;
            default:
                if (column is null) break;
                var values = items.Select(i => column.GetValue(i!)).Where(v => v is not null).ToList();
                if (values.Count == 0) break;
                if (def.Type is PBGridSummaryType.Min) value = values.Min(GridValueComparer.Instance);
                else if (def.Type is PBGridSummaryType.Max) value = values.Max(GridValueComparer.Instance);
                else if (GridField.IsNumeric(values[0]!.GetType()))
                {
                    var sum = values.Sum(v => Convert.ToDecimal(v, CultureInfo.InvariantCulture));
                    value = def.Type == PBGridSummaryType.Sum ? sum : sum / values.Count;
                }
                break;
        }
        return new PBGridSummaryValue(def.Type, def.FieldName, def.Name, value, SummaryText(def, value, inGroupRow));
    }

    private PBGridSummaryValue SummaryOverQuery(SummaryDef def, IQueryable<TItem> query)
    {
        object? value = def.Type switch
        {
            PBGridSummaryType.Count => totalCount,
            PBGridSummaryType.Custom => null,
            _ => def.FieldName is null ? null : GridQueryable.Aggregate(query, def.FieldName, def.Type),
        };
        if (def.Type == PBGridSummaryType.Custom) return Summary(def, query.ToList(), null, false);
        return new PBGridSummaryValue(def.Type, def.FieldName, def.Name, value, SummaryText(def, value, false));
    }

    private string SummaryText(SummaryDef def, object? value, bool inGroupRow)
    {
        var column = def.FieldName is null ? null : FieldColumn(def.FieldName);
        string valueText;
        if (value is null) valueText = "";
        else if (def.ValueFormat is { Length: > 0 } format)
            valueText = format.Contains('{') ? string.Format(CultureInfo.CurrentCulture, format, value) : value is IFormattable f ? f.ToString(format, CultureInfo.CurrentCulture) : value.ToString() ?? "";
        else if (def.Type == PBGridSummaryType.Count) valueText = ((int)value).ToString("N0", CultureInfo.CurrentCulture);
        else if (column?.DisplayFormat is not null) valueText = column.FormatValue(value);
        else if (def.Type == PBGridSummaryType.Average && value is decimal average) valueText = average.ToString("N2", CultureInfo.CurrentCulture);
        else valueText = column?.FormatValue(value) ?? Convert.ToString(value, CultureInfo.CurrentCulture) ?? "";

        var name = inGroupRow && def.Type is not PBGridSummaryType.Count and not PBGridSummaryType.Custom && column is not null
            ? $"{def.TypeText} of {column.DisplayCaption}"
            : def.TypeText;
        return def.DisplayText is { Length: > 0 } text
            ? string.Format(CultureInfo.CurrentCulture, text, name, valueText)
            : $"{name}: {valueText}";
    }

    /// <summary>A total summary's value by its Name (or FieldName).</summary>
    public object? GetTotalSummaryValue(string name)
    {
        EnsureData();
        return totalSummaryValues.FirstOrDefault(v => v.Name == name || (v.Name is null && v.FieldName == name))?.Value;
    }

    /// <summary>The rows after filtering and sorting (all pages).</summary>
    public IReadOnlyList<TItem> GetFilteredItems()
    {
        EnsureData();
        return filteredQuery is not null ? filteredQuery.ToList() : filteredItems;
    }

    /// <summary>The data items on the current page (or rendered window).</summary>
    public IReadOnlyList<TItem> GetVisibleItems()
    {
        EnsureData();
        return pageRows.Where(r => r.Kind == GridRowKind.Data).Select(r => r.Item!).ToList();
    }

    private List<PBGridSummaryValue> FooterSummariesFor(IEnumerable<PBGridSummaryValue> values, PBDataGridColumn column, IReadOnlyList<SummaryDef> defs)
    {
        var result = new List<PBGridSummaryValue>();
        var list = values.ToList();
        for (var i = 0; i < defs.Count && i < list.Count; i++)
        {
            var target = defs[i].FooterColumn ?? defs[i].FieldName;
            if (target is not null && (target == column.Key || target == column.FieldName)) result.Add(list[i]);
        }
        return result;
    }
}
