using Microsoft.AspNetCore.Components.Forms;
using Microsoft.JSInterop;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>When the filter panel (the active filter as text, under the grid) is shown.</summary>
public enum PBGridFilterPanelDisplayMode { Never, Auto, Always }

/// <summary>When group footers (group summaries under each group) are shown.</summary>
public enum PBGridGroupFooterDisplayMode { Auto, Always, Never }

/// <summary>
/// A data grid in the spirit of DevExpress's Blazor Grid, styled with Material 3 tokens: data binding
/// (in-memory, <see cref="IQueryable{T}"/> server mode, or a <see cref="DataProvider"/>), sorting,
/// grouping, filter row / filter menus / filter panel / filter builder / search, summaries, selection,
/// focused row, five edit modes with validation, master-detail, templates, column resizing / reordering /
/// fixing / hiding / bands, layout save and restore, adaptivity, XLSX/CSV export, context menus, row
/// drag and drop, paging or virtual scrolling, and keyboard navigation.
/// </summary>
public partial class PBDataGrid<TItem> : WorkspaceComponentBase, IPBDataGridHost, IGridFieldSource, IAsyncDisposable
{
    [Inject] private IJSRuntime JS { get; set; } = default!;

    // ------------------------------------------------------------------------------ data

    /// <summary>The rows. An <see cref="IQueryable{T}"/> runs filtering, sorting, paging and summaries as a query (server mode).</summary>
    [Parameter] public IEnumerable<TItem>? Data { get; set; }

    /// <summary>Loads one page at a time (e.g. over HTTP); the grid sends sorting, filters and search with each request.</summary>
    [Parameter] public Func<PBGridDataRequest, CancellationToken, Task<PBGridDataResult<TItem>>>? DataProvider { get; set; }

    /// <summary>The key field: identifies rows across reloads for selection, focus, expansion and editing.</summary>
    [Parameter] public string? KeyFieldName { get; set; }

    /// <summary>Column components (<see cref="PBDataGridColumn"/> and friends).</summary>
    [Parameter] public RenderFragment? Columns { get; set; }

    [Parameter] public RenderFragment? TotalSummary { get; set; }
    [Parameter] public RenderFragment? GroupSummary { get; set; }

    /// <summary>Computes <see cref="PBGridSummaryType.Custom"/> summaries: set <c>Value</c>.</summary>
    [Parameter] public Action<PBGridCustomSummaryEventArgs>? CustomSummary { get; set; }

    // ------------------------------------------------------------------------------ paging and scrolling

    /// <summary>Rows per page; 0 shows all rows.</summary>
    [Parameter] public int PageSize { get; set; } = 10;
    [Parameter] public EventCallback<int> PageSizeChanged { get; set; }
    [Parameter] public int PageIndex { get; set; }
    [Parameter] public EventCallback<int> PageIndexChanged { get; set; }
    [Parameter] public IReadOnlyList<int> PageSizeOptions { get; set; } = [10, 20, 50, 100];
    [Parameter] public bool ShowPager { get; set; } = true;
    [Parameter] public PBGridPagerPosition PagerPosition { get; set; }

    /// <summary>Renders only the rows in view (no pager). Set <see cref="Height"/>.</summary>
    [Parameter] public bool VirtualScrollingEnabled { get; set; }

    /// <summary>CSS height of the scrolling area (the header stays on top), e.g. <c>480px</c>.</summary>
    [Parameter] public string? Height { get; set; }

    /// <summary>Row height in pixels used by virtual scrolling.</summary>
    [Parameter] public float RowHeight { get; set; } = 52;

    // ------------------------------------------------------------------------------ features

    [Parameter] public bool ShowSearchBox { get; set; }
    [Parameter] public string? SearchText { get; set; }
    [Parameter] public EventCallback<string?> SearchTextChanged { get; set; }
    [Parameter] public string SearchBoxPlaceholder { get; set; } = "Search…";

    [Parameter] public bool ShowFilterRow { get; set; }
    [Parameter] public bool ShowFilterMenuButtons { get; set; }
    [Parameter] public PBGridFilterPanelDisplayMode FilterPanelDisplayMode { get; set; }

    /// <summary>An extra filter, combined with the user's (also edited by the filter builder).</summary>
    [Parameter] public PBGridFilter? FilterCriteria { get; set; }
    [Parameter] public EventCallback<PBGridFilter?> FilterCriteriaChanged { get; set; }

    [Parameter] public bool ShowGroupPanel { get; set; }

    /// <summary>Keeps grouped columns among the data columns (hidden by default: group rows show their values).</summary>
    [Parameter] public bool ShowGroupedColumns { get; set; }
    [Parameter] public bool AutoExpandAllGroups { get; set; }
    [Parameter] public PBGridGroupFooterDisplayMode GroupFooterDisplayMode { get; set; }

    [Parameter] public bool AllowSort { get; set; } = true;
    [Parameter] public bool AllowGroup { get; set; } = true;
    [Parameter] public bool AllowColumnReorder { get; set; } = true;
    [Parameter] public PBGridColumnResizeMode ColumnResizeMode { get; set; }

    // ------------------------------------------------------------------------------ selection and focus

    [Parameter] public PBGridSelectionMode SelectionMode { get; set; } = PBGridSelectionMode.Multiple;
    [Parameter] public PBGridSelectAllMode SelectAllCheckboxMode { get; set; }

    /// <summary>Clicking a row selects it (Ctrl toggles, Shift selects a range).</summary>
    [Parameter] public bool AllowSelectRowByClick { get; set; }
    [Parameter] public IReadOnlyList<TItem>? SelectedDataItems { get; set; }
    [Parameter] public EventCallback<IReadOnlyList<TItem>> SelectedDataItemsChanged { get; set; }
    [Parameter] public TItem? SelectedDataItem { get; set; }
    [Parameter] public EventCallback<TItem?> SelectedDataItemChanged { get; set; }

    [Parameter] public bool FocusedRowEnabled { get; set; }
    [Parameter] public TItem? FocusedDataItem { get; set; }
    [Parameter] public EventCallback<TItem?> FocusedDataItemChanged { get; set; }

    [Parameter] public EventCallback<TItem> RowClick { get; set; }
    [Parameter] public EventCallback<TItem> RowDoubleClick { get; set; }

    // ------------------------------------------------------------------------------ editing

    [Parameter] public PBGridEditMode EditMode { get; set; }
    [Parameter] public PBGridNewItemRowPosition EditNewRowPosition { get; set; }

    /// <summary>A permanent "click to add" row at the top or bottom.</summary>
    [Parameter] public PBGridNewItemRowPosition NewItemRowPosition { get; set; }

    [Parameter] public EventCallback<PBGridCustomizeEditModelEventArgs<TItem>> CustomizeEditModel { get; set; }

    /// <summary>Saves an edit. Without a handler the grid copies the edit model into the item (or adds a new item to a list).</summary>
    [Parameter] public EventCallback<PBGridEditModelSavingEventArgs<TItem>> EditModelSaving { get; set; }

    /// <summary>Deletes an item. Without a handler the grid removes it from a list.</summary>
    [Parameter] public EventCallback<PBGridDataItemDeletingEventArgs<TItem>> DataItemDeleting { get; set; }

    /// <summary>Batch mode Save. Without a handler the grid applies the changes to a list.</summary>
    [Parameter] public EventCallback<PBGridBatchChanges<TItem>> BatchSaving { get; set; }

    [Parameter] public bool ConfirmDelete { get; set; } = true;

    /// <summary>Replaces the default edit form (EditForm and PopupEditForm modes).</summary>
    [Parameter] public RenderFragment<PBGridEditFormContext<TItem>>? EditFormTemplate { get; set; }

    [Parameter] public string PopupEditFormTitle { get; set; } = "Edit row";

    // ------------------------------------------------------------------------------ templates

    [Parameter] public RenderFragment<TItem>? DetailRowTemplate { get; set; }
    [Parameter] public PBGridDetailRowDisplayMode DetailRowDisplayMode { get; set; }

    /// <summary>Only one detail row open at a time.</summary>
    [Parameter] public bool AutoCollapseDetailRow { get; set; }

    /// <summary>A full-width row under every data row (e.g. a description).</summary>
    [Parameter] public RenderFragment<TItem>? RowPreviewTemplate { get; set; }

    [Parameter] public RenderFragment<PBGridGroupRowContext>? GroupRowTemplate { get; set; }
    [Parameter] public RenderFragment? EmptyDataTemplate { get; set; }
    [Parameter] public string EmptyDataText { get; set; } = "No data to display";

    /// <summary>Content of the toolbar above the grid (search box sits at its end).</summary>
    [Parameter] public RenderFragment? ToolbarTemplate { get; set; }

    // ------------------------------------------------------------------------------ appearance

    [Parameter] public PBGridLines GridLines { get; set; } = PBGridLines.Horizontal;
    [Parameter] public bool AlternatingRows { get; set; }

    /// <summary>40px rows instead of 52px.</summary>
    [Parameter] public bool Dense { get; set; }

    /// <summary>Adds classes/styles to rows and cells (conditional formatting).</summary>
    [Parameter] public Action<PBGridCustomizeElementEventArgs>? CustomizeElement { get; set; }

    /// <summary>Hides lower-priority columns on narrow widths and shows their values in an expandable row.</summary>
    [Parameter] public bool AdaptivityEnabled { get; set; }

    // ------------------------------------------------------------------------------ context menus, layout, drag and drop

    [Parameter] public PBGridContextMenus ContextMenus { get; set; }
    [Parameter] public Action<PBGridContextMenuEventArgs>? CustomizeContextMenu { get; set; }

    [Parameter] public EventCallback<PBGridLayout> LayoutAutoSaving { get; set; }
    [Parameter] public Func<Task<PBGridLayout?>>? LayoutAutoLoading { get; set; }

    [Parameter] public bool AllowDragRows { get; set; }

    /// <summary>Grids with the same group can exchange rows.</summary>
    [Parameter] public string? DragDropGroup { get; set; }
    [Parameter] public PBGridDropTarget AllowedDropTarget { get; set; } = PBGridDropTarget.All;
    [Parameter] public EventCallback<PBGridItemsDroppedEventArgs<TItem>> ItemsDropped { get; set; }

    // ------------------------------------------------------------------------------ state

    private readonly List<PBDataGridColumn> allColumns = [];
    private readonly List<PBDataGridSummaryItem> totalSummaryItems = [];
    private readonly List<PBDataGridSummaryItem> groupSummaryItems = [];
    private readonly List<SummaryDef> userSummaries = [];
    private readonly string gridId = "pb-grid-" + Guid.NewGuid().ToString("N")[..8];
    private int columnCounter;
    private bool dirty = true;
    private ElementReference root;
    private DotNetObjectReference<PBDataGrid<TItem>>? selfReference;
    private bool jsInitialized;
    private bool layoutLoaded;

    private int pageIndex;
    private int pageSize;
    private int lastPageIndexParam = -1;
    private int lastPageSizeParam = -1;
    private string? searchText;
    private string? lastSearchParam;
    private PBGridFilter? filterCriteria;
    private PBGridFilter? lastFilterParam;
    private bool filterEnabled = true;
    private bool groupPanelVisible;
    private bool filterRowVisible;
    private bool lastShowGroupPanel;
    private bool lastShowFilterRow;
    private bool initialized;

    private IEnumerable<TItem>? lastData;

    Type IPBDataGridHost.ItemType => typeof(TItem);

    /// <summary>An item's identity: its key field's value, or the item itself.</summary>
    private object KeyOf(TItem item) =>
        KeyFieldName is null ? item! : GridField.GetValue(item!, KeyFieldName) ?? item!;

    protected override void OnParametersSet()
    {
        if (!initialized || PageIndex != lastPageIndexParam) pageIndex = PageIndex;
        if (!initialized || PageSize != lastPageSizeParam) pageSize = PageSize;
        lastPageIndexParam = PageIndex;
        lastPageSizeParam = PageSize;
        if (!initialized || SearchText != lastSearchParam) searchText = SearchText;
        lastSearchParam = SearchText;
        if (!initialized || !Equals(FilterCriteria, lastFilterParam)) filterCriteria = FilterCriteria;
        lastFilterParam = FilterCriteria;
        if (!initialized || ShowGroupPanel != lastShowGroupPanel) groupPanelVisible = ShowGroupPanel;
        lastShowGroupPanel = ShowGroupPanel;
        if (!initialized || ShowFilterRow != lastShowFilterRow) filterRowVisible = ShowFilterRow;
        lastShowFilterRow = ShowFilterRow;
        SyncSelectionFromParameters();
        SyncFocusFromParameters();
        initialized = true;

        // The parent re-rendered: its data may have changed in place, so rebuild.
        if (!ReferenceEquals(lastData, Data))
        {
            providerResult = null;
            ObserveCollection(Data);
        }
        lastData = Data;
        dirty = true;
    }

    void IPBDataGridHost.AddColumn(PBDataGridColumn column)
    {
        column.Order = columnCounter++;
        column.CurrentVisibleIndex = column.Order;
        allColumns.Add(column);
        Invalidate();
    }

    void IPBDataGridHost.RemoveColumn(PBDataGridColumn column)
    {
        if (allColumns.Remove(column)) Invalidate();
    }

    void IPBDataGridHost.AddSummary(PBDataGridSummaryItem item, bool group)
    {
        (group ? groupSummaryItems : totalSummaryItems).Add(item);
        Invalidate();
    }

    void IPBDataGridHost.RemoveSummary(PBDataGridSummaryItem item)
    {
        if (totalSummaryItems.Remove(item) | groupSummaryItems.Remove(item)) Invalidate();
    }

    private System.Collections.Specialized.INotifyCollectionChanged? observedCollection;

    /// <summary>Data that reports its changes (ObservableCollection) refreshes the grid by itself.</summary>
    private void ObserveCollection(IEnumerable<TItem>? data)
    {
        if (observedCollection is not null) observedCollection.CollectionChanged -= OnDataCollectionChanged;
        observedCollection = data as System.Collections.Specialized.INotifyCollectionChanged;
        if (observedCollection is not null) observedCollection.CollectionChanged += OnDataCollectionChanged;
    }

    private void OnDataCollectionChanged(object? sender, System.Collections.Specialized.NotifyCollectionChangedEventArgs e) => Invalidate();

    public void Invalidate()
    {
        dirty = true;
        InvokeAsync(StateHasChanged);
    }

    /// <summary>Re-reads the data (after you changed it outside the grid) and re-renders.</summary>
    public Task ReloadAsync()
    {
        providerResult = null;
        dirty = true;
        return InvokeAsync(StateHasChanged);
    }

    // ------------------------------------------------------------------------------ columns

    /// <summary>Leaf columns in display order (bands flattened), hidden ones included.</summary>
    private List<PBDataGridColumn> OrderedLeaves()
    {
        var result = new List<PBDataGridColumn>();
        void Walk(PBDataGridBandColumn? band)
        {
            foreach (var column in allColumns.Where(c => c.Band == band).OrderBy(c => c.CurrentVisibleIndex).ThenBy(c => c.Order))
            {
                if (column.IsBand) Walk((PBDataGridBandColumn)column);
                else result.Add(column);
            }
        }
        Walk(null);
        return result;
    }

    private bool IsShown(PBDataGridColumn column) =>
        column.CurrentVisible && !column.AdaptiveHidden && (column.Band is null || IsShown(column.Band))
        && (ShowGroupedColumns || !AllowGroup || column.CurrentGroupIndex < 0 || !column.CanGroup || DataProvider is not null);

    /// <summary>Visible leaf columns in display order; left-fixed first, right-fixed last.</summary>
    private List<PBDataGridColumn> VisibleLeaves()
    {
        var leaves = OrderedLeaves().Where(IsShown).ToList();
        return leaves.Where(c => c.CurrentFixedPosition == PBGridFixedPosition.Left)
            .Concat(leaves.Where(c => c.CurrentFixedPosition == PBGridFixedPosition.None))
            .Concat(leaves.Where(c => c.CurrentFixedPosition == PBGridFixedPosition.Right))
            .ToList();
    }

    private IEnumerable<PBDataGridColumn> DataColumns => allColumns.Where(c => c.IsDataColumn);

    private List<PBDataGridColumn> GroupedColumns() =>
        DataColumns.Where(c => c.CurrentGroupIndex >= 0 && AllowGroup && c.CanGroup).OrderBy(c => c.CurrentGroupIndex).ThenBy(c => c.Order).ToList();

    private List<PBDataGridColumn> SortedColumns() =>
        DataColumns.Where(c => c.CurrentSortOrder != PBGridSortOrder.None && c.CurrentGroupIndex < 0)
            .OrderBy(c => c.CurrentSortIndex < 0 ? int.MaxValue : c.CurrentSortIndex).ThenBy(c => c.Order).ToList();

    /// <summary>A column by Name, FieldName or caption key.</summary>
    public PBDataGridColumn? GetColumn(string key) =>
        allColumns.FirstOrDefault(c => c.Key == key) ?? allColumns.FirstOrDefault(c => c.FieldName == key);

    /// <summary>All declared columns (bands and service columns included).</summary>
    public IReadOnlyList<PBDataGridColumn> GetColumns() => allColumns;

    private static string FilterField(PBDataGridColumn column) => column.FieldName ?? column.Key;

    // ------------------------------------------------------------------------------ IGridFieldSource

    Type? IGridFieldSource.FieldType(string field) =>
        FieldColumn(field)?.FieldType(typeof(TItem)) ?? GridField.GetFieldType(typeof(TItem), field);

    object? IGridFieldSource.Value(object item, string field) =>
        FieldColumn(field) is { } column ? column.GetValue(item) : GridField.GetFieldType(typeof(TItem), field) is null ? null : GridField.GetValue(item, field);

    string IGridFieldSource.DisplayText(object item, string field) =>
        FieldColumn(field) is { } column ? column.FormatValue(column.GetValue(item)) : Convert.ToString(GridField.GetValue(item, field)) ?? "";

    private PBDataGridColumn? FieldColumn(string field) =>
        allColumns.FirstOrDefault(c => c.IsDataColumn && (c.FieldName == field || (c.FieldName is null && c.Key == field)));

    private string CaptionOf(string field) => FieldColumn(field)?.DisplayCaption ?? PBDataGridColumn.SplitWords(field.Split('.')[^1]);

    // ------------------------------------------------------------------------------ lifecycle

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            selfReference = DotNetObjectReference.Create(this);
            GridDragRegistry.Register(JS, gridId, this);
        }
        if (!layoutLoaded && LayoutAutoLoading is not null && allColumns.Count > 0)
        {
            layoutLoaded = true;
            var layout = await LayoutAutoLoading();
            if (layout is not null)
            {
                ApplyLayoutCore(layout);
                StateHasChanged();
            }
        }
        var options = JsOptions();
        if (!jsInitialized)
        {
            jsInitialized = true;
            await DesignSystemJs.InvokeVoidAsync(JS, "gridInit", root, selfReference, options);
        }
        else
        {
            await DesignSystemJs.InvokeVoidAsync(JS, "gridSync", root, options);
        }
        await AfterRenderPopupsAsync();
        if (refreshVirtualizer && virtualizer is not null)
        {
            refreshVirtualizer = false;
            await virtualizer.RefreshDataAsync();
        }
        if (focusRowAfterRender is int index)
        {
            focusRowAfterRender = null;
            await DesignSystemJs.InvokeVoidAsync(JS, "focusFirst", root, $"tr[data-row='{index}']");
        }
        if (focusEditorAfterRender)
        {
            focusEditorAfterRender = false;
            await DesignSystemJs.InvokeVoidAsync(JS, "focusFirst", root, ".pb-grid__editor--autofocus, .pb-grid__edit-row .pb-grid__editor:not([disabled])");
        }
    }

    private object JsOptions() => new
    {
        gridId,
        dragGroup = DragDropGroup ?? (AllowDragRows ? gridId : null),
        allowInternal = AllowedDropTarget.HasFlag(PBGridDropTarget.Internal),
        allowExternal = AllowedDropTarget.HasFlag(PBGridDropTarget.External),
        acceptsDrops = ItemsDropped.HasDelegate,
        treeDrop = IsTree,
        resizeMode = ColumnResizeMode switch
        {
            PBGridColumnResizeMode.NextColumn => "next",
            PBGridColumnResizeMode.ColumnsContainer => "container",
            _ => null,
        },
        columnDrag = AllowColumnReorder || (groupPanelVisible && AllowGroup),
        adaptivity = AdaptivityEnabled,
    };

    public async ValueTask DisposeAsync()
    {
        providerCancellation?.Cancel();
        providerCancellation?.Dispose();
        ObserveCollection(null);
        GridDragRegistry.Unregister(JS, gridId);
        if (popupPositioned) await DesignSystemJs.InvokeVoidAsync(JS, "unposition", popup);
        if (jsInitialized) await DesignSystemJs.InvokeVoidAsync(JS, "gridDispose", root);
        selfReference?.Dispose();
        GC.SuppressFinalize(this);
    }
}
