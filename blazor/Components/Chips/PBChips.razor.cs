using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.AspNetCore.Components.Rendering;
using Microsoft.JSInterop;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// Material 3 chips. With <see cref="PBChip"/> children it is a chip set (mat-chip-set / mat-chip-listbox):
/// assist, filter and input chips, optionally stacked or reorderable by drag and drop.
/// Without children it is a tag box (mat-chip-grid with an input and an autocomplete, DevExpress TagBox):
/// the selected items of <see cref="Data"/> and custom tags as input chips, a search box and a dropdown
/// list with search highlighting, columns, groups, disabled items, virtual scrolling and templates.
/// </summary>
/// <typeparam name="TItem">The data item type (string for plain chip sets).</typeparam>
/// <typeparam name="TValue">The value type: <see cref="ValueFieldName"/>'s type, or the item type itself.</typeparam>
public partial class PBChips<TItem, TValue> : WorkspaceFieldComponentBase, IPBChipsColumnOwner, IAsyncDisposable
{
    [Inject] private IJSRuntime JS { get; set; } = default!;
    [CascadingParameter] private EditContext? EditContext { get; set; }

    // ------------------------------------------------------------------------------ chip set

    /// <summary>Chip set: renders a listbox of selectable filter chips (mat-chip-listbox) instead of a list.</summary>
    [Parameter] public bool Selectable { get; set; }

    /// <summary>Chip set: more than one chip may be selected.</summary>
    [Parameter] public bool Multiple { get; set; } = true;

    /// <summary>Chip set: one chip per row, full width (mat-chip-set-stacked).</summary>
    [Parameter] public bool Stacked { get; set; }

    /// <summary>Chips can be reordered by drag and drop. The tag box reorders its tags itself.</summary>
    [Parameter] public bool Reorderable { get; set; }

    /// <summary>Chip set: a chip was dropped at a new index; reorder your list.</summary>
    [Parameter] public EventCallback<PBChipsReorderEventArgs> OnReorder { get; set; }

    // ------------------------------------------------------------------------------ data

    /// <summary>The items listed in the dropdown.</summary>
    [Parameter] public IEnumerable<TItem>? Data { get; set; }

    /// <summary>Loads the items asynchronously (the dropdown shows the empty data area while loading).</summary>
    [Parameter] public Func<CancellationToken, Task<IEnumerable<TItem>>>? DataAsync { get; set; }

    /// <summary>The item property that supplies item and tag text (default: the item's ToString()).</summary>
    [Parameter] public string? TextFieldName { get; set; }

    /// <summary>The item property that supplies values (default: a <c>Value</c> property, or the item itself).</summary>
    [Parameter] public string? ValueFieldName { get; set; }

    /// <summary>The item property whose values group the dropdown list.</summary>
    [Parameter] public string? GroupFieldName { get; set; }

    /// <summary>A bool item property: true disables the item.</summary>
    [Parameter] public string? DisabledFieldName { get; set; }

    /// <summary>Tag text built from the visible columns, e.g. <c>{0} {1}</c>.</summary>
    [Parameter] public string? EditFormat { get; set; }

    /// <summary>The values of the selected items. With string values, custom tags are values too.</summary>
    [Parameter] public IEnumerable<TValue>? Values { get; set; }
    [Parameter] public EventCallback<IEnumerable<TValue>> ValuesChanged { get; set; }
    [Parameter] public Expression<Func<IEnumerable<TValue>>>? ValuesExpression { get; set; }

    /// <summary>The text of every tag, custom tags included.</summary>
    [Parameter] public IEnumerable<string>? Tags { get; set; }
    [Parameter] public EventCallback<IEnumerable<string>> TagsChanged { get; set; }
    [Parameter] public Expression<Func<IEnumerable<string>>>? TagsExpression { get; set; }

    /// <summary>Typed text that matches no item becomes a tag (on Enter or another separator key).</summary>
    [Parameter] public bool AllowCustomTags { get; set; }

    /// <summary>Keys that turn the typed text into a tag (matChipInputSeparatorKeyCodes).</summary>
    [Parameter] public IReadOnlyList<string> SeparatorKeys { get; set; } = ["Enter", ","];

    /// <summary>Custom tags can be edited: double-click a tag or press Enter on it (mat-chip-row editable).</summary>
    [Parameter] public bool EditableTags { get; set; }

    /// <summary>Selected items are not listed in the dropdown. When false they are listed with a checkmark.</summary>
    [Parameter] public bool HideSelectedItems { get; set; } = true;

    [Parameter] public PBChipsSearchMode SearchMode { get; set; }
    [Parameter] public PBSearchFilterCondition SearchFilterCondition { get; set; }
    [Parameter] public PBSearchTextParseMode SearchTextParseMode { get; set; }

    /// <summary>Milliseconds between the last keystroke and the search.</summary>
    [Parameter] public int SearchDelay { get; set; }

    /// <summary><see cref="PBChipsColumn"/>s of a multi-column dropdown list.</summary>
    [Parameter] public RenderFragment? Columns { get; set; }

    [Parameter] public PBListRenderMode ListRenderMode { get; set; }

    /// <summary>Height of one list row for virtual scrolling.</summary>
    [Parameter] public float ItemSize { get; set; } = 48;

    /// <summary>Placeholder text while there are no tags.</summary>
    [Parameter] public string? NullText { get; set; }

    [Parameter] public PBClearButtonDisplayMode ClearButtonDisplayMode { get; set; }

    /// <summary>Shows the dropdown arrow button (default: when there is data to list).</summary>
    [Parameter] public bool? ShowDropDownButton { get; set; }

    [Parameter] public PBDropDownWidthMode DropDownWidthMode { get; set; }

    [Parameter] public RenderFragment<PBChipsTagContext<TItem>>? TagDisplayTemplate { get; set; }
    [Parameter] public RenderFragment<PBChipsItemContext<TItem, TValue>>? ItemDisplayTemplate { get; set; }
    [Parameter] public RenderFragment<PBChipsGroupContext>? GroupHeaderDisplayTemplate { get; set; }
    [Parameter] public RenderFragment<PBChipsEmptyDataAreaContext>? EmptyDataAreaTemplate { get; set; }

    [Parameter] public bool Disabled { get; set; }
    [Parameter] public bool ReadOnly { get; set; }
    [Parameter] public bool Required { get; set; }

    // ------------------------------------------------------------------------------ state

    private sealed class Tag
    {
        public TItem? Item;
        public bool HasItem;
        public bool IsCustom;
        public string Text = "";
        public TValue? Value;
    }

    private enum RowKind { Group, Item }

    private sealed record Row(RowKind Kind, TItem? Item, string? Group, int VisibleIndex, bool Selected, bool ItemDisabled, int Index);

    private readonly List<Tag> tags = [];
    private readonly List<PBChipsColumn> columns = [];
    private List<Row> rows = [];
    private List<TItem> items = [];
    private IEnumerable<TItem>? lastData;
    private Func<CancellationToken, Task<IEnumerable<TItem>>>? lastDataAsync;
    private IEnumerable<TItem>? loadedData;
    private CancellationTokenSource? loadCts;
    private CancellationTokenSource? searchCts;
    private bool dataLoading;
    private TValue[]? emittedValues;
    private string[]? emittedTags;
    private string text = "";
    private string searchText = "";
    private bool open;
    private bool focused;
    private bool positioned;
    private int activeRow = -1;
    private bool scrollActive;
    private int editingIndex = -1;
    private string editText = "";
    private string editInitial = "";
    private bool focusEdit;
    private int? focusTag;
    private int columnOrder;
    private ElementReference root;
    private ElementReference inputRef;
    private ElementReference panel;
    private DotNetObjectReference<PBChips<TItem, TValue>>? selfRef;
    private bool jsReady;
    private bool reorderReady;

    private readonly Dictionary<string, PropertyInfo?> properties = [];

    private bool TagBox => ChildContent is null;
    private bool IsDisabled => Disabled || IsDisabledAttribute;
    private bool IsRequired => Required || IsRequiredAttribute;
    private bool Interactive => !IsDisabled && !ReadOnly;
    private string PanelId => FieldId + "-list";
    private IEnumerable<TItem> Source => Data ?? loadedData ?? [];
    private bool HasData => Data is not null || DataAsync is not null;
    private bool DropDownButtonVisible => ShowDropDownButton ?? HasData;
    private List<PBChipsColumn> VisibleColumns =>
        columns.Where(c => c.Visible).OrderBy(c => c.VisibleIndex < 0 ? int.MaxValue : c.VisibleIndex).ThenBy(c => c.Order).ToList();
    private string? ErrorMessage => ErrorText ?? ValidationMessage();
    private string? Hint => ErrorMessage ?? SupportingText;
    private bool Floating => tags.Count > 0 || focused || text.Length > 0 || !string.IsNullOrEmpty(NullText);

    // ------------------------------------------------------------------------------ columns

    void IPBChipsColumnOwner.AddColumn(PBChipsColumn column)
    {
        column.Order = columnOrder++;
        columns.Add(column);
        ColumnsChanged();
    }

    void IPBChipsColumnOwner.RemoveColumn(PBChipsColumn column)
    {
        columns.Remove(column);
        ColumnsChanged();
    }

    void IPBChipsColumnOwner.ColumnChanged() => ColumnsChanged();

    // Columns register after the first parameters pass: tag text (EditFormat) and search depend on them.
    private void ColumnsChanged()
    {
        foreach (var tag in tags.Where(t => t.HasItem)) tag.Text = TextOf(tag.Item);
        Refilter();
        StateHasChanged();
    }

    // ------------------------------------------------------------------------------ parameters

    protected override async Task OnParametersSetAsync()
    {
        if (!TagBox) return;

        if (DataAsync != lastDataAsync)
        {
            lastDataAsync = DataAsync;
            await LoadAsync();
        }

        var dataChanged = !ReferenceEquals(Data, lastData);
        lastData = Data;
        if (dataChanged || items.Count == 0) items = Source.ToList();

        if (Tags is not null && !SameSequence(Tags, emittedTags))
        {
            RebuildFromTags(Tags);
        }
        else if (Values is not null && (dataChanged || !SameSequence(Values, emittedValues)))
        {
            RebuildFromValues(Values);
        }
        else if (Values is null && Tags is null && emittedValues is not null)
        {
            tags.Clear();
            emittedValues = null;
            emittedTags = null;
        }

        Refilter();
    }

    private async Task LoadAsync()
    {
        loadCts?.Cancel();
        if (DataAsync is null)
        {
            loadedData = null;
            return;
        }
        var cts = loadCts = new CancellationTokenSource();
        dataLoading = true;
        try
        {
            loadedData = (await DataAsync(cts.Token)).ToList();
        }
        catch (OperationCanceledException)
        {
            return;
        }
        finally
        {
            if (cts == loadCts) dataLoading = false;
        }
        items = Source.ToList();
        if (Values is not null) RebuildFromValues(Values);
        else if (Tags is not null) RebuildFromTags(Tags);
        Refilter();
    }

    private static bool SameSequence<T>(IEnumerable<T>? a, T[]? b)
    {
        if (a is null || b is null) return a is null && b is null;
        return a.SequenceEqual(b, EqualityComparer<T>.Default);
    }

    private void RebuildFromValues(IEnumerable<TValue> values)
    {
        var custom = tags.Where(t => t.IsCustom).ToList();
        tags.Clear();
        foreach (var value in values)
        {
            var match = FindByValue(value, out var item);
            if (match) tags.Add(DataTag(item!));
            else if (StringValues && value is string s) tags.Add(CustomTag(s));
            else tags.Add(new Tag { Value = value, Text = Convert.ToString(value, CultureInfo.CurrentCulture) ?? "" });
        }
        if (!StringValues) tags.AddRange(custom);
        emittedValues = values.ToArray();
    }

    private void RebuildFromTags(IEnumerable<string> texts)
    {
        tags.Clear();
        foreach (var t in texts)
        {
            var item = items.FirstOrDefault(i => string.Equals(TextOf(i), t, StringComparison.CurrentCultureIgnoreCase));
            tags.Add(item is not null ? DataTag(item) : CustomTag(t));
        }
        emittedTags = texts.ToArray();
    }

    private bool FindByValue(TValue value, out TItem? found)
    {
        foreach (var item in items)
        {
            if (EqualityComparer<TValue>.Default.Equals(ValueOf(item), value))
            {
                found = item;
                return true;
            }
        }
        found = default;
        return false;
    }

    private Tag DataTag(TItem item) => new() { Item = item, HasItem = true, Text = TextOf(item), Value = ValueOf(item) };

    private Tag CustomTag(string value) => new()
    {
        IsCustom = true,
        Text = value,
        Value = StringValues ? (TValue)(object)value : default,
    };

    private static bool StringValues => typeof(TValue) == typeof(string);

    // ------------------------------------------------------------------------------ item fields

    private PropertyInfo? Property(string? name)
    {
        if (string.IsNullOrEmpty(name)) return null;
        if (!properties.TryGetValue(name, out var property))
        {
            property = typeof(TItem).GetProperty(name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
            properties[name] = property;
        }
        return property;
    }

    private object? Field(TItem? item, string? name) => item is null ? null : Property(name)?.GetValue(item);

    private static string Format(object? value) => Convert.ToString(value, CultureInfo.CurrentCulture) ?? "";

    /// <summary>The text of an item: EditFormat over the visible columns, TextFieldName, or ToString().</summary>
    private string TextOf(TItem? item)
    {
        if (item is null) return "";
        if (EditFormat is not null && columns.Count > 0)
        {
            var args = VisibleColumns.Select(c => Field(item, c.FieldName)).ToArray();
            try
            {
                return string.Format(CultureInfo.CurrentCulture, EditFormat, args);
            }
            catch (FormatException)
            {
                // Columns register one by one; until all are there the format may reference a missing one.
                return string.Join(" ", args.Select(Format));
            }
        }
        if (TextFieldName is not null) return Format(Field(item, TextFieldName));
        return Format(item);
    }

    private TValue? ValueOf(TItem item)
    {
        var property = Property(ValueFieldName) ?? (ValueFieldName is null && item is not TValue ? Property("Value") : null);
        if (property is not null)
        {
            var raw = property.GetValue(item);
            if (raw is TValue typed) return typed;
            if (raw is null) return default;
            var target = Nullable.GetUnderlyingType(typeof(TValue)) ?? typeof(TValue);
            return (TValue)Convert.ChangeType(raw, target, CultureInfo.InvariantCulture);
        }
        return item is TValue self ? self : default;
    }

    private bool IsItemDisabled(TItem item) => DisabledFieldName is not null && Field(item, DisabledFieldName) is true;

    private string? GroupOf(TItem item) => GroupFieldName is null ? null : Format(Field(item, GroupFieldName));

    private bool IsSelected(TItem item) => tags.Any(t => t.HasItem && EqualityComparer<TItem>.Default.Equals(t.Item, item));

    // ------------------------------------------------------------------------------ search

    private string[] SearchWords()
    {
        var value = searchText.Trim();
        if (value.Length == 0 || SearchMode == PBChipsSearchMode.Disabled) return [];
        return SearchTextParseMode == PBSearchTextParseMode.ExactMatch
            ? [value]
            : value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
    }

    private IEnumerable<string> SearchTexts(TItem item)
    {
        if (columns.Count > 0)
        {
            foreach (var column in VisibleColumns.Where(c => c.SearchEnabled)) yield return Format(Field(item, column.FieldName));
        }
        else
        {
            yield return TextOf(item);
        }
    }

    private bool WordMatches(string candidate, string word) => SearchFilterCondition switch
    {
        PBSearchFilterCondition.StartsWith => candidate.StartsWith(word, StringComparison.CurrentCultureIgnoreCase),
        PBSearchFilterCondition.Equals => string.Equals(candidate, word, StringComparison.CurrentCultureIgnoreCase),
        _ => candidate.Contains(word, StringComparison.CurrentCultureIgnoreCase),
    };

    private bool Matches(TItem item, string[] words)
    {
        if (words.Length == 0) return true;
        var texts = SearchTexts(item).ToList();
        bool Word(string w) => texts.Any(t => WordMatches(t, w));
        return SearchTextParseMode == PBSearchTextParseMode.GroupWordsByOr ? words.Any(Word) : words.All(Word);
    }

    /// <summary>Rebuilds the dropdown rows: filtered, grouped (headers in first-appearance order).</summary>
    private void Refilter()
    {
        var words = SearchWords();
        var listed = items
            .Where(i => !(HideSelectedItems && IsSelected(i)))
            .Where(i => Matches(i, words))
            .ToList();

        var result = new List<Row>(listed.Count + 8);
        if (GroupFieldName is null)
        {
            for (var i = 0; i < listed.Count; i++) result.Add(ItemRow(listed[i], i, result.Count));
        }
        else
        {
            var index = 0;
            foreach (var group in listed.GroupBy(GroupOf))
            {
                result.Add(new Row(RowKind.Group, default, group.Key ?? "", -1, false, true, result.Count));
                foreach (var item in group) result.Add(ItemRow(item, index++, result.Count));
            }
        }
        rows = result;
        if (activeRow >= rows.Count || (activeRow >= 0 && !CanSelect(rows[activeRow]))) activeRow = FirstSelectable(0, 1);
    }

    private Row ItemRow(TItem item, int visibleIndex, int index) => new(RowKind.Item, item, null, visibleIndex, IsSelected(item), IsItemDisabled(item), index);

    private static bool CanSelect(Row row) => row.Kind == RowKind.Item && !row.ItemDisabled;

    private int FirstSelectable(int from, int step)
    {
        for (var i = from; i >= 0 && i < rows.Count; i += step)
        {
            if (CanSelect(rows[i])) return i;
        }
        return -1;
    }

    /// <summary>Highlights the search words in <paramref name="value"/>.</summary>
    private RenderFragment Highlight(string value) => builder =>
    {
        var words = SearchWords();
        if (words.Length == 0)
        {
            builder.AddContent(0, value);
            return;
        }
        var marks = new bool[value.Length];
        foreach (var word in words)
        {
            switch (SearchFilterCondition)
            {
                case PBSearchFilterCondition.StartsWith:
                    if (value.StartsWith(word, StringComparison.CurrentCultureIgnoreCase)) Array.Fill(marks, true, 0, word.Length);
                    break;
                case PBSearchFilterCondition.Equals:
                    if (string.Equals(value, word, StringComparison.CurrentCultureIgnoreCase)) Array.Fill(marks, true);
                    break;
                default:
                    for (var at = value.IndexOf(word, StringComparison.CurrentCultureIgnoreCase); at >= 0 && word.Length > 0;
                         at = value.IndexOf(word, at + word.Length, StringComparison.CurrentCultureIgnoreCase))
                    {
                        Array.Fill(marks, true, at, word.Length);
                    }
                    break;
            }
        }
        var start = 0;
        while (start < value.Length)
        {
            var end = start;
            while (end < value.Length && marks[end] == marks[start]) end++;
            var part = value[start..end];
            if (marks[start])
            {
                builder.OpenElement(1, "span");
                builder.AddAttribute(2, "class", "pb-chips__match");
                builder.AddContent(3, part);
                builder.CloseElement();
            }
            else
            {
                builder.AddContent(4, part);
            }
            start = end;
        }
    };

    // ------------------------------------------------------------------------------ dropdown

    private void Open()
    {
        if (!Interactive || open) return;
        open = true;
        Refilter();
        activeRow = FirstSelectable(0, 1);
    }

    private void Close()
    {
        open = false;
        activeRow = -1;
    }

    private bool PanelVisible => open && (rows.Count > 0 || EmptyAreaVisible);

    private bool EmptyAreaVisible =>
        rows.Count == 0 && !(AllowCustomTags && text.Length > 0) && (HasData || EmptyDataAreaTemplate is not null);

    private async Task ToggleFromButtonAsync()
    {
        if (open) Close();
        else Open();
        await FocusInputAsync();
    }

    private void MoveActive(int step)
    {
        if (rows.Count == 0) return;
        var start = activeRow < 0 ? (step > 0 ? 0 : rows.Count - 1) : activeRow + step;
        var next = FirstSelectable(start, step);
        if (next >= 0)
        {
            activeRow = next;
            scrollActive = true;
        }
    }

    private string? ActiveDescendant => PanelVisible && activeRow >= 0 ? OptionId(activeRow) : null;

    private string OptionId(int row) => $"{PanelId}-{row}";

    // ------------------------------------------------------------------------------ input

    private void OnFocus()
    {
        focused = true;
        Open();
    }

    private void OnBlur()
    {
        focused = false;
        Close();
    }

    private async Task OnInputAsync(ChangeEventArgs e)
    {
        text = e.Value?.ToString() ?? "";
        searchCts?.Cancel();
        if (SearchDelay > 0)
        {
            var cts = searchCts = new CancellationTokenSource();
            try
            {
                await Task.Delay(SearchDelay, cts.Token);
            }
            catch (TaskCanceledException)
            {
                return;
            }
        }
        searchText = text;
        if (!open) Open();
        Refilter();
        activeRow = FirstSelectable(0, 1);
    }

    private async Task OnKeyDownAsync(KeyboardEventArgs e)
    {
        if (!Interactive) return;
        switch (e.Key)
        {
            case "ArrowDown":
                if (!open || e.AltKey) Open();
                else MoveActive(1);
                return;
            case "ArrowUp":
                if (e.AltKey) Close();
                else if (open) MoveActive(-1);
                return;
            case "Home" when open && text.Length == 0:
                activeRow = FirstSelectable(0, 1);
                scrollActive = true;
                return;
            case "End" when open && text.Length == 0:
                activeRow = FirstSelectable(rows.Count - 1, -1);
                scrollActive = true;
                return;
            case "Escape":
                Close();
                return;
            case "Tab":
                Close();
                return;
        }

        if (!SeparatorKeys.Contains(e.Key)) return;
        if (e.Key == "Enter" && PanelVisible && activeRow >= 0 && (text.Length > 0 || !AllowCustomTags))
        {
            await SelectRowAsync(activeRow);
            return;
        }
        await CommitTextAsync();
    }

    /// <summary>Turns the typed text into a tag: a matching item, or a custom tag when allowed.</summary>
    private async Task CommitTextAsync()
    {
        var value = text.Trim();
        if (value.Length == 0) return;
        var item = items.FirstOrDefault(i => !IsItemDisabled(i) && string.Equals(TextOf(i), value, StringComparison.CurrentCultureIgnoreCase));
        if (item is not null)
        {
            if (!IsSelected(item)) tags.Add(DataTag(item));
        }
        else if (AllowCustomTags)
        {
            if (!tags.Any(t => string.Equals(t.Text, value, StringComparison.CurrentCultureIgnoreCase))) tags.Add(CustomTag(value));
        }
        else
        {
            return;
        }
        await ClearTextAsync();
        await EmitAsync();
    }

    private async Task ClearTextAsync()
    {
        text = "";
        searchText = "";
        await DesignSystemJs.InvokeVoidAsync(JS, "setInputValue", inputRef, "");
        Refilter();
    }

    private async Task SelectRowAsync(int index)
    {
        if (index < 0 || index >= rows.Count || !CanSelect(rows[index])) return;
        var item = rows[index].Item!;
        var existing = tags.FindIndex(t => t.HasItem && EqualityComparer<TItem>.Default.Equals(t.Item, item));
        if (existing >= 0) tags.RemoveAt(existing);
        else tags.Add(DataTag(item));
        await ClearTextAsync();
        activeRow = Math.Min(index, rows.Count - 1);
        if (activeRow >= 0 && !CanSelect(rows[activeRow])) activeRow = FirstSelectable(activeRow, 1) is var n and >= 0 ? n : FirstSelectable(activeRow, -1);
        await EmitAsync();
    }

    private async Task OnOptionMouseDownAsync(int index)
    {
        activeRow = index;
        await SelectRowAsync(index);
    }

    // ------------------------------------------------------------------------------ tags

    private async Task RemoveTagAsync(int index, bool focusAfter = false)
    {
        if (!Interactive || index < 0 || index >= tags.Count) return;
        tags.RemoveAt(index);
        Refilter();
        await EmitAsync();
        // The previous chip (Material's chip grid), the first one, or the input when none are left.
        if (focusAfter) focusTag = index > 0 ? index - 1 : tags.Count > 0 ? 0 : -1;
    }

    private async Task OnTagKeyDownAsync(KeyboardEventArgs e, int index)
    {
        if (editingIndex == index) return;
        switch (e.Key)
        {
            case "Backspace":
            case "Delete":
                await RemoveTagAsync(index, focusAfter: true);
                break;
            case "Enter" when EditableTags && CanEdit(tags[index]):
                StartEdit(index);
                break;
        }
    }

    private bool CanEdit(Tag tag) => Interactive && EditableTags && (tag.IsCustom || !HasData);

    private void StartEdit(int index)
    {
        if (!CanEdit(tags[index])) return;
        editingIndex = index;
        editText = editInitial = tags[index].Text;
        focusEdit = true;
    }

    private async Task CommitEditAsync()
    {
        if (editingIndex < 0) return;
        var index = editingIndex;
        editingIndex = -1;
        var value = editText.Trim();
        if (value.Length == 0)
        {
            tags.RemoveAt(index);
        }
        else if (value != tags[index].Text)
        {
            var item = items.FirstOrDefault(i => string.Equals(TextOf(i), value, StringComparison.CurrentCultureIgnoreCase));
            tags[index] = item is not null ? DataTag(item) : CustomTag(value);
        }
        Refilter();
        await EmitAsync();
        focusTag = Math.Min(index, tags.Count);
    }

    private async Task OnEditKeyDownAsync(KeyboardEventArgs e)
    {
        if (e.Key == "Enter") await CommitEditAsync();
        else if (e.Key == "Escape")
        {
            focusTag = editingIndex;
            editingIndex = -1;
        }
    }

    private async Task ClearAsync()
    {
        tags.Clear();
        await ClearTextAsync();
        await EmitAsync();
        await FocusInputAsync();
    }

    /// <summary>Called by the drag-and-drop script when a chip is dropped at a new index.</summary>
    [JSInvokable]
    public async Task OnChipDrop(int oldIndex, int newIndex)
    {
        if (oldIndex == newIndex) return;
        if (TagBox)
        {
            if (oldIndex < 0 || oldIndex >= tags.Count) return;
            var tag = tags[oldIndex];
            tags.RemoveAt(oldIndex);
            tags.Insert(Math.Clamp(newIndex, 0, tags.Count), tag);
            await EmitAsync();
        }
        else
        {
            await OnReorder.InvokeAsync(new PBChipsReorderEventArgs(oldIndex, newIndex));
        }
        StateHasChanged();
    }

    private async Task EmitAsync()
    {
        var values = tags.Where(t => t.HasItem || (t.IsCustom && StringValues)).Select(t => t.Value!).ToArray();
        var texts = tags.Select(t => t.Text).ToArray();
        emittedValues = values;
        emittedTags = texts;
        await ValuesChanged.InvokeAsync(values);
        await TagsChanged.InvokeAsync(texts);
        if (EditContext is not null)
        {
            if (ValuesExpression is not null) EditContext.NotifyFieldChanged(FieldIdentifier.Create(ValuesExpression));
            if (TagsExpression is not null) EditContext.NotifyFieldChanged(FieldIdentifier.Create(TagsExpression));
        }
    }

    private string? ValidationMessage()
    {
        if (EditContext is null) return null;
        if (ValuesExpression is not null)
        {
            var message = EditContext.GetValidationMessages(FieldIdentifier.Create(ValuesExpression)).FirstOrDefault();
            if (message is not null) return message;
        }
        return TagsExpression is null ? null : EditContext.GetValidationMessages(FieldIdentifier.Create(TagsExpression)).FirstOrDefault();
    }

    /// <summary>Focuses the search input.</summary>
    public async Task FocusInputAsync() => await DesignSystemJs.InvokeVoidAsync(JS, "focus", inputRef, null);

    /// <summary>Opens the dropdown list.</summary>
    public async Task OpenAsync()
    {
        await FocusInputAsync();
        Open();
        StateHasChanged();
    }

    // ------------------------------------------------------------------------------ rendering hooks

    private PBChipsTagContext<TItem> TagContext(int index) =>
        new(tags[index].Item, tags[index].IsCustom, tags[index].Text, () => RemoveTagAsync(index));

    private PBChipsItemContext<TItem, TValue> ItemContext(Row row)
    {
        var display = TextOf(row.Item);
        return new(row.Item!, ValueOf(row.Item!), display, Highlight(display), row.VisibleIndex, row.Selected);
    }

    private PBChipsCellContext CellContext(Row row, PBChipsColumn column)
    {
        var value = Field(row.Item, column.FieldName);
        var display = Format(value);
        return new(row.Item, column, value, display, Highlight(display), row.VisibleIndex);
    }

    private string ColumnTemplate =>
        string.Join(' ', VisibleColumns.Select(c => c.Width ?? "minmax(0, 1fr)"));

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (TagBox && !jsReady)
        {
            jsReady = true;
            selfRef ??= DotNetObjectReference.Create(this);
            await DesignSystemJs.InvokeVoidAsync(JS, "chipsInit", root, inputRef, SeparatorKeys.Where(k => k != "Enter").ToArray());
        }
        if (Reorderable && !reorderReady)
        {
            reorderReady = true;
            selfRef ??= DotNetObjectReference.Create(this);
            await DesignSystemJs.InvokeVoidAsync(JS, "chipsReorderInit", root, selfRef);
        }

        if (!TagBox) return;
        if (PanelVisible)
        {
            var options = new
            {
                x = "start",
                anchorClosest = ".pb-form-field",
                anchorSelector = ".pb-form-field__wrapper",
                matchWidth = DropDownWidthMode == PBDropDownWidthMode.EditorWidth,
                minWidth = DropDownWidthMode == PBDropDownWidthMode.ContentOrEditorWidth,
            };
            if (!positioned)
            {
                positioned = true;
                await DesignSystemJs.InvokeVoidAsync(JS, "position", panel, null, options);
            }
            else
            {
                await DesignSystemJs.InvokeVoidAsync(JS, "reposition", panel);
            }
            if (scrollActive && activeRow >= 0)
            {
                scrollActive = false;
                if (ListRenderMode == PBListRenderMode.Virtual)
                    await DesignSystemJs.InvokeVoidAsync(JS, "scrollRowIntoView", panel, activeRow * ItemSize, ItemSize);
                else
                    await DesignSystemJs.InvokeVoidAsync(JS, "scrollIntoView", panel, ".pb-option--active");
            }
        }
        else
        {
            positioned = false;
        }
        if (focusEdit)
        {
            focusEdit = false;
            await DesignSystemJs.InvokeVoidAsync(JS, "chipsFocusEdit", root);
        }
        if (focusTag is int tagIndex)
        {
            focusTag = null;
            await DesignSystemJs.InvokeVoidAsync(JS, "chipsFocusTag", root, tagIndex);
        }
    }

    public async ValueTask DisposeAsync()
    {
        loadCts?.Cancel();
        searchCts?.Cancel();
        if (reorderReady) await DesignSystemJs.InvokeVoidAsync(JS, "chipsReorderDispose", root);
        if (jsReady) await DesignSystemJs.InvokeVoidAsync(JS, "chipsDispose", root);
        selfRef?.Dispose();
        GC.SuppressFinalize(this);
    }
}
