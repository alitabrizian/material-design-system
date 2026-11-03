using System.Globalization;
using Microsoft.AspNetCore.Components.Rendering;

namespace PartoBita.DesignSystem.Blazor.Components;

public enum PBGridTextAlignment { Auto, Start, Center, End }

/// <summary>How the grid edits a column's value (Auto picks one from the field's type).</summary>
public enum PBGridEditorType { Auto, Text, Number, Date, CheckBox, ComboBox, TextArea, None }

/// <summary>The grid a column belongs to, as the columns see it.</summary>
internal interface IPBDataGridHost
{
    Type ItemType { get; }

    void AddColumn(PBDataGridColumn column);

    void RemoveColumn(PBDataGridColumn column);

    void AddSummary(PBDataGridSummaryItem item, bool group);

    void RemoveSummary(PBDataGridSummaryItem item);

    /// <summary>A column's or summary's parameters changed: rebuild data and re-render.</summary>
    void Invalidate();
}

/// <summary>
/// A grid column bound to <see cref="FieldName"/> (a property, or a nested path like
/// <c>Customer.Name</c>), or an unbound column computed by <see cref="UnboundExpression"/>.
/// Parameters are initial values: the user's sorting, grouping, resizing, reordering and hiding
/// change the column's current state, and a parameter only overrides that state when its value
/// changes. Declare columns inside <c>PBDataGrid.Columns</c>.
/// </summary>
public class PBDataGridColumn : ComponentBase, IDisposable
{
    [CascadingParameter] internal IPBDataGridHost? Grid { get; set; }
    [CascadingParameter(Name = "PBDataGridBand")] internal PBDataGridBandColumn? ParentBand { get; set; }

    /// <summary>The item property (or dotted path) this column shows.</summary>
    [Parameter] public string? FieldName { get; set; }

    /// <summary>Stable key for layout, API calls and summaries (defaults to <see cref="FieldName"/>).</summary>
    [Parameter] public string? Name { get; set; }

    /// <summary>Header text (defaults to <see cref="FieldName"/> split into words).</summary>
    [Parameter] public string? Caption { get; set; }

    /// <summary>CSS width, e.g. <c>120px</c> or <c>20%</c>. Unset columns share the remaining width.</summary>
    [Parameter] public string? Width { get; set; }

    /// <summary>Narrowest width in pixels while resizing, and the width adaptivity reserves for the column.</summary>
    [Parameter] public int MinWidth { get; set; } = 60;

    [Parameter] public bool Visible { get; set; } = true;

    /// <summary>Position among its siblings (declaration order when unset).</summary>
    [Parameter] public int VisibleIndex { get; set; } = -1;

    /// <summary>A .NET format: <c>C2</c>, <c>d</c>, <c>{0:N0} pcs</c>.</summary>
    [Parameter] public string? DisplayFormat { get; set; }

    [Parameter] public PBGridTextAlignment TextAlignment { get; set; }

    [Parameter] public bool AllowSort { get; set; } = true;
    [Parameter] public PBGridSortOrder SortOrder { get; set; }
    [Parameter] public int SortIndex { get; set; } = -1;

    [Parameter] public bool AllowGroup { get; set; } = true;
    [Parameter] public int GroupIndex { get; set; } = -1;
    [Parameter] public PBGridGroupInterval GroupInterval { get; set; }

    /// <summary>With <see cref="PBGridGroupInterval.Custom"/>: maps a value to its group key (also the group's text).</summary>
    [Parameter] public Func<object?, object?>? CustomGroupKey { get; set; }

    /// <summary>Shows a filter row editor and a filter menu button for this column.</summary>
    [Parameter] public bool AllowFilter { get; set; } = true;

    /// <summary>Initial filter row value.</summary>
    [Parameter] public object? FilterRowValue { get; set; }

    /// <summary>Filter row operator (default: Contains for text, Equals otherwise).</summary>
    [Parameter] public PBGridFilterOperator? FilterRowOperator { get; set; }

    [Parameter] public bool ShowInColumnChooser { get; set; } = true;

    /// <summary>Keeps the column visible while scrolling horizontally.</summary>
    [Parameter] public PBGridFixedPosition FixedPosition { get; set; }

    [Parameter] public bool ReadOnly { get; set; }

    [Parameter] public bool SearchEnabled { get; set; } = true;

    [Parameter] public bool ExportEnabled { get; set; } = true;

    /// <summary>Adaptivity: when the grid is too narrow, columns with higher values hide first (0 never hides).</summary>
    [Parameter] public int AdaptivePriority { get; set; }

    [Parameter] public PBGridEditorType EditorType { get; set; }

    /// <summary>Values for a combo box editor (and the filter row's list).</summary>
    [Parameter] public IEnumerable<object?>? EditorItems { get; set; }

    /// <summary>Type of an unbound column's value (needed for filtering, sorting and editors).</summary>
    [Parameter] public Type? UnboundType { get; set; }

    /// <summary>Computes an unbound column's value from a data item.</summary>
    [Parameter] public Func<object, object?>? UnboundExpression { get; set; }

    [Parameter] public RenderFragment<PBGridCellContext>? CellDisplayTemplate { get; set; }
    [Parameter] public RenderFragment<PBDataGridColumn>? HeaderCaptionTemplate { get; set; }
    [Parameter] public RenderFragment<PBGridEditContext>? CellEditTemplate { get; set; }

    /// <summary>Extra CSS class for the column's data cells.</summary>
    [Parameter] public string? CssClass { get; set; }

    // ---------------------------------------------------------------- current (user) state

    internal int Order { get; set; }
    internal bool CurrentVisible { get; set; }
    internal int CurrentVisibleIndex { get; set; }
    internal string? CurrentWidth { get; set; }
    internal PBGridSortOrder CurrentSortOrder { get; set; }
    internal int CurrentSortIndex { get; set; }
    internal int CurrentGroupIndex { get; set; }
    internal PBGridFixedPosition CurrentFixedPosition { get; set; }
    internal string? FilterRowText { get; set; }
    internal PBGridFilterOperator? FilterRowOp { get; set; }
    internal List<object?>? FilterValues { get; set; }

    /// <summary>Hidden by adaptivity (shown in the row's adaptive detail instead).</summary>
    internal bool AdaptiveHidden { get; set; }

    private bool initialized;
    private (bool Visible, int VisibleIndex, string? Width, PBGridSortOrder Sort, int SortIndex, int GroupIndex, PBGridFixedPosition Fixed, object? FilterRowValue) last;
    private string? signature;

    public string Key => Name ?? FieldName ?? $"column{Order}";

    public string DisplayCaption => Caption ?? (FieldName is null ? "" : SplitWords(FieldName.Split('.')[^1]));

    public bool IsVisible => CurrentVisible;
    public PBGridSortOrder CurrentSort => CurrentSortOrder;
    public int CurrentGroup => CurrentGroupIndex;

    internal virtual bool IsDataColumn => FieldName is not null || UnboundExpression is not null;
    internal virtual bool IsBand => false;
    internal PBDataGridBandColumn? Band => ParentBand;

    internal virtual bool CanSort => AllowSort && IsDataColumn;
    internal virtual bool CanGroup => AllowGroup && IsDataColumn;
    internal virtual bool CanFilter => AllowFilter && IsDataColumn;

    internal Type? FieldType(Type itemType) =>
        UnboundType ?? (FieldName is null ? null : GridField.GetFieldType(itemType, FieldName));

    internal bool IsUnbound => UnboundExpression is not null;

    public object? GetValue(object item) =>
        UnboundExpression is not null ? UnboundExpression(item) : FieldName is null ? null : GridField.GetValue(item, FieldName);

    internal bool CanEdit(Type itemType) =>
        IsDataColumn && !ReadOnly && !IsUnbound && FieldName is not null && GridField.CanWrite(itemType, FieldName);

    public string FormatValue(object? value)
    {
        if (value is null) return "";
        if (DisplayFormat is { Length: > 0 } format)
        {
            if (format.Contains('{')) return string.Format(CultureInfo.CurrentCulture, format, value);
            if (value is IFormattable formattable) return formattable.ToString(format, CultureInfo.CurrentCulture);
        }
        return value switch
        {
            DateTime d => d.ToString(d.TimeOfDay == TimeSpan.Zero ? "d" : "g", CultureInfo.CurrentCulture),
            DateOnly d => d.ToString("d", CultureInfo.CurrentCulture),
            bool b => b ? "Yes" : "No",
            Enum e => SplitWords(e.ToString()),
            IFormattable f => f.ToString(null, CultureInfo.CurrentCulture),
            _ => value.ToString() ?? "",
        };
    }

    internal string AlignClass(Type itemType)
    {
        var align = TextAlignment;
        if (align == PBGridTextAlignment.Auto)
        {
            var type = FieldType(itemType);
            align = GridField.IsNumeric(type) ? PBGridTextAlignment.End : GridField.IsBool(type) ? PBGridTextAlignment.Center : PBGridTextAlignment.Start;
        }
        return align switch
        {
            PBGridTextAlignment.End => "pb-data-grid__cell--end",
            PBGridTextAlignment.Center => "pb-data-grid__cell--center",
            _ => "",
        };
    }

    internal PBGridFilterOperator DefaultFilterOperator(Type itemType) =>
        FieldType(itemType) == typeof(string) ? PBGridFilterOperator.Contains : PBGridFilterOperator.Equals;

    internal PBGridEditorType ResolvedEditor(Type itemType)
    {
        if (EditorType != PBGridEditorType.Auto) return EditorType;
        if (EditorItems is not null) return PBGridEditorType.ComboBox;
        var type = FieldType(itemType);
        var underlying = type is null ? null : Nullable.GetUnderlyingType(type) ?? type;
        if (underlying is null) return PBGridEditorType.Text;
        if (underlying.IsEnum) return PBGridEditorType.ComboBox;
        if (GridField.IsBool(underlying)) return PBGridEditorType.CheckBox;
        if (GridField.IsDate(underlying)) return PBGridEditorType.Date;
        if (GridField.IsNumeric(underlying)) return PBGridEditorType.Number;
        return PBGridEditorType.Text;
    }

    internal IEnumerable<object?> ComboItems(Type itemType)
    {
        if (EditorItems is not null) return EditorItems;
        var type = FieldType(itemType);
        var underlying = type is null ? null : Nullable.GetUnderlyingType(type) ?? type;
        return underlying is { IsEnum: true } ? Enum.GetValues(underlying).Cast<object?>() : [];
    }

    protected override void OnInitialized()
    {
        if (Grid is null) throw new InvalidOperationException($"{GetType().Name} must be declared inside a PBDataGrid's Columns.");
        Grid.AddColumn(this);
    }

    protected override void OnParametersSet()
    {
        var now = (Visible, VisibleIndex, Width, SortOrder, SortIndex, GroupIndex, FixedPosition, FilterRowValue);
        if (!initialized || now.Visible != last.Visible) CurrentVisible = Visible;
        if (!initialized || now.VisibleIndex != last.VisibleIndex) CurrentVisibleIndex = VisibleIndex >= 0 ? VisibleIndex : CurrentVisibleIndex;
        if (!initialized || now.Width != last.Width) CurrentWidth = Width;
        if (!initialized || now.SortOrder != last.Sort || now.SortIndex != last.SortIndex)
        {
            CurrentSortOrder = SortOrder;
            CurrentSortIndex = SortIndex;
        }
        if (!initialized || now.GroupIndex != last.GroupIndex) CurrentGroupIndex = GroupIndex;
        if (!initialized || now.FixedPosition != last.Fixed) CurrentFixedPosition = FixedPosition;
        if (!initialized || !Equals(now.FilterRowValue, last.FilterRowValue))
        {
            FilterRowText = FilterRowValue switch
            {
                null => null,
                DateTime d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
                _ => FilterRowValue.ToString(),
            };
            FilterRowOp ??= FilterRowOperator;
        }
        last = now;

        // Re-render the grid only when something it shows changed (templates are read live).
        var sig = string.Join('|', FieldName, Name, Caption, Width, MinWidth, Visible, VisibleIndex, DisplayFormat, TextAlignment, AllowSort, SortOrder,
            SortIndex, AllowGroup, GroupIndex, GroupInterval, AllowFilter, FilterRowValue, FilterRowOperator, FixedPosition, ReadOnly, AdaptivePriority, EditorType, ShowInColumnChooser);
        if (initialized && sig != signature) Grid?.Invalidate();
        signature = sig;
        initialized = true;
    }

    public virtual void Dispose()
    {
        Grid?.RemoveColumn(this);
        GC.SuppressFinalize(this);
    }

    internal static string SplitWords(string name)
    {
        var builder = new System.Text.StringBuilder(name.Length + 4);
        for (var i = 0; i < name.Length; i++)
        {
            var c = name[i];
            if (i > 0 && char.IsUpper(c) && (char.IsLower(name[i - 1]) || (i + 1 < name.Length && char.IsLower(name[i + 1]) && char.IsUpper(name[i - 1]))))
                builder.Append(' ');
            builder.Append(c);
        }
        return builder.ToString();
    }
}

/// <summary>A header band: a caption spanning the columns declared inside it (multi-row headers).</summary>
public sealed class PBDataGridBandColumn : PBDataGridColumn
{
    /// <summary>The band's columns.</summary>
    [Parameter] public RenderFragment? ChildContent { get; set; }

    internal override bool IsDataColumn => false;
    internal override bool IsBand => true;

    protected override void BuildRenderTree(RenderTreeBuilder builder)
    {
        builder.OpenComponent<CascadingValue<PBDataGridBandColumn>>(0);
        builder.AddComponentParameter(1, "Name", "PBDataGridBand");
        builder.AddComponentParameter(2, "Value", this);
        builder.AddComponentParameter(3, "IsFixed", true);
        builder.AddComponentParameter(4, "ChildContent", ChildContent);
        builder.CloseComponent();
    }
}

/// <summary>A column of row selection checkboxes; its header checkbox selects all rows.</summary>
public sealed class PBDataGridSelectionColumn : PBDataGridColumn
{
    /// <summary>Shows the select-all checkbox in the header (multiple selection only).</summary>
    [Parameter] public bool AllowSelectAll { get; set; } = true;

    public PBDataGridSelectionColumn()
    {
        Width = "56px";
        MinWidth = 56;
    }

    internal override bool IsDataColumn => false;
}

/// <summary>New / Edit / Delete buttons (Save / Cancel while a row is edited inline).</summary>
public sealed class PBDataGridCommandColumn : PBDataGridColumn
{
    [Parameter] public bool NewButtonVisible { get; set; } = true;
    [Parameter] public bool EditButtonVisible { get; set; } = true;
    [Parameter] public bool DeleteButtonVisible { get; set; } = true;

    /// <summary>Replaces the buttons of data rows (the item is <c>context.DataItem</c>).</summary>
    [Parameter] public RenderFragment<PBGridCellContext>? CellTemplate { get; set; }

    public PBDataGridCommandColumn()
    {
        Width = "136px";
        MinWidth = 100;
    }

    internal override bool IsDataColumn => false;
}

/// <summary>
/// A total summary (in <c>PBDataGrid.TotalSummary</c>, shown in the footer) or group summary (in
/// <c>PBDataGrid.GroupSummary</c>, shown in group rows, or in group footers when
/// <see cref="FooterColumnName"/> is set).
/// </summary>
public sealed class PBDataGridSummaryItem : ComponentBase, IDisposable
{
    [CascadingParameter] internal IPBDataGridHost? Grid { get; set; }
    [CascadingParameter(Name = "PBDataGridSummaryGroup")] internal bool IsGroupSummary { get; set; }

    [Parameter] public PBGridSummaryType SummaryType { get; set; }

    /// <summary>The field the summary aggregates (any field for Count).</summary>
    [Parameter] public string? FieldName { get; set; }

    /// <summary>The column whose footer cell shows the summary (defaults to <see cref="FieldName"/>'s column).</summary>
    [Parameter] public string? FooterColumnName { get; set; }

    /// <summary>Format of the whole text: <c>{0}</c> is the summary name, <c>{1}</c> the formatted value. Default "Sum: {1}".</summary>
    [Parameter] public string? DisplayText { get; set; }

    /// <summary>Format of the value (defaults to the column's DisplayFormat; Count uses N0).</summary>
    [Parameter] public string? ValueDisplayFormat { get; set; }

    /// <summary>Identifies the summary (custom summaries, GetTotalSummaryValue).</summary>
    [Parameter] public string? Name { get; set; }

    [Parameter] public bool Visible { get; set; } = true;

    private string? signature;

    public string TypeText => SummaryType switch
    {
        PBGridSummaryType.Average => "Avg",
        PBGridSummaryType.Custom => Name ?? "Custom",
        _ => SummaryType.ToString(),
    };

    protected override void OnInitialized()
    {
        if (Grid is null) throw new InvalidOperationException("PBDataGridSummaryItem must be declared inside a PBDataGrid's TotalSummary or GroupSummary.");
        Grid.AddSummary(this, IsGroupSummary);
    }

    protected override void OnParametersSet()
    {
        var sig = string.Join('|', SummaryType, FieldName, FooterColumnName, DisplayText, ValueDisplayFormat, Name, Visible);
        if (signature is not null && sig != signature) Grid?.Invalidate();
        signature = sig;
    }

    public void Dispose() => Grid?.RemoveSummary(this);
}
