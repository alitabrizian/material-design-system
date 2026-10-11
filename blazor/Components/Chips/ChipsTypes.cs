namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>Whether typing in a <see cref="PBChips{TItem, TValue}"/> filters the dropdown list.</summary>
public enum PBChipsSearchMode { AutoSearch, Disabled }

/// <summary>How a search word matches item text.</summary>
public enum PBSearchFilterCondition { Contains, StartsWith, Equals }

/// <summary>How search text with several words is matched: all words, any word, or the whole text.</summary>
public enum PBSearchTextParseMode { GroupWordsByAnd, GroupWordsByOr, ExactMatch }

/// <summary><c>Entire</c> renders every list item; <c>Virtual</c> renders only the items in view.</summary>
public enum PBListRenderMode { Entire, Virtual }

/// <summary>
/// The dropdown list's width: the wider of its content and the editor (default), its content only,
/// or exactly the editor (items that do not fit are cut with an ellipsis).
/// </summary>
public enum PBDropDownWidthMode { ContentOrEditorWidth, ContentWidth, EditorWidth }

/// <summary>A chip was dragged from <see cref="OldIndex"/> to <see cref="NewIndex"/>.</summary>
public sealed record PBChipsReorderEventArgs(int OldIndex, int NewIndex);

/// <summary>Context of <c>TagDisplayTemplate</c>: one tag (chip) of the editor.</summary>
public sealed class PBChipsTagContext<TItem>
{
    internal PBChipsTagContext(TItem? dataItem, bool isCustom, string displayText, Func<Task> removeTagAction)
    {
        DataItem = dataItem;
        IsCustom = isCustom;
        DisplayText = displayText;
        RemoveTagAction = removeTagAction;
    }

    /// <summary>The tag's data item (default for a custom tag).</summary>
    public TItem? DataItem { get; }

    /// <summary>The tag was typed by the user and is not in the data source.</summary>
    public bool IsCustom { get; }

    public string DisplayText { get; }

    /// <summary>Removes this tag.</summary>
    public Func<Task> RemoveTagAction { get; }
}

/// <summary>Context of <c>ItemDisplayTemplate</c>: one item of the dropdown list.</summary>
public sealed class PBChipsItemContext<TItem, TValue>
{
    internal PBChipsItemContext(TItem dataItem, TValue? value, string displayText, RenderFragment highlightedDisplayText, int visibleIndex, bool selected)
    {
        DataItem = dataItem;
        Value = value;
        DisplayText = displayText;
        HighlightedDisplayText = highlightedDisplayText;
        VisibleIndex = visibleIndex;
        Selected = selected;
    }

    public TItem DataItem { get; }
    public TValue? Value { get; }
    public string DisplayText { get; }

    /// <summary>The display text with the search matches highlighted.</summary>
    public RenderFragment HighlightedDisplayText { get; }

    /// <summary>The item's index among the listed (filtered) items.</summary>
    public int VisibleIndex { get; }

    /// <summary>The item is one of the editor's tags (shown when HideSelectedItems is false).</summary>
    public bool Selected { get; }
}

/// <summary>Context of <c>GroupHeaderDisplayTemplate</c>.</summary>
public sealed record PBChipsGroupContext(string GroupName);

/// <summary>Context of <c>EmptyDataAreaTemplate</c>.</summary>
public sealed record PBChipsEmptyDataAreaContext(bool IsDataLoading);

/// <summary>Context of <see cref="PBChipsColumn.CellDisplayTemplate"/>.</summary>
public sealed class PBChipsCellContext
{
    internal PBChipsCellContext(object? dataItem, PBChipsColumn column, object? value, string displayText, RenderFragment highlightedDisplayText, int visibleIndex)
    {
        DataItem = dataItem;
        Column = column;
        Value = value;
        DisplayText = displayText;
        HighlightedDisplayText = highlightedDisplayText;
        VisibleIndex = visibleIndex;
    }

    public object? DataItem { get; }
    public PBChipsColumn Column { get; }
    public object? Value { get; }
    public string DisplayText { get; }
    public RenderFragment HighlightedDisplayText { get; }
    public int VisibleIndex { get; }
}

/// <summary>Implemented by <see cref="PBChips{TItem, TValue}"/> so its columns can register.</summary>
public interface IPBChipsColumnOwner
{
    void AddColumn(PBChipsColumn column);
    void RemoveColumn(PBChipsColumn column);
    void ColumnChanged();
}
