namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>The page event raised by <see cref="PBPaginator"/> (MatPaginator's PageEvent).</summary>
public sealed record PBPageEvent(int PageIndex, int PreviousPageIndex, int PageSize, int Length);

/// <summary>
/// mat-paginator: "Items per page" select, "1 – 10 of 100" range label and first/previous/next/last
/// buttons. Bind <see cref="PageIndex"/> and <see cref="PageSize"/>, or handle <see cref="Page"/>.
/// </summary>
public partial class PBPaginator : WorkspaceComponentBase
{
    [Parameter] public int Length { get; set; }

    [Parameter] public int PageIndex { get; set; }
    [Parameter] public EventCallback<int> PageIndexChanged { get; set; }

    [Parameter] public int PageSize { get; set; } = 10;
    [Parameter] public EventCallback<int> PageSizeChanged { get; set; }

    [Parameter] public IReadOnlyList<int> PageSizeOptions { get; set; } = [5, 10, 25, 100];

    [Parameter] public bool ShowFirstLastButtons { get; set; }

    [Parameter] public bool HidePageSize { get; set; }

    [Parameter] public bool Disabled { get; set; }

    [Parameter] public EventCallback<PBPageEvent> Page { get; set; }

    [Parameter] public string ItemsPerPageLabel { get; set; } = "Items per page:";
    [Parameter] public string FirstPageLabel { get; set; } = "First page";
    [Parameter] public string PreviousPageLabel { get; set; } = "Previous page";
    [Parameter] public string NextPageLabel { get; set; } = "Next page";
    [Parameter] public string LastPageLabel { get; set; } = "Last page";

    private readonly string LabelId = "pb-paginator-label-" + Guid.NewGuid().ToString("N")[..8];

    private int PageCount => PageSize <= 0 ? 0 : (int)Math.Ceiling(Length / (double)PageSize);

    private bool IsFirst => PageIndex <= 0;

    private bool IsLast => PageIndex >= PageCount - 1;

    // Same format as MatPaginatorIntl.getRangeLabel.
    private string RangeLabel
    {
        get
        {
            if (Length == 0 || PageSize == 0) return $"0 of {Length}";
            var start = PageIndex * PageSize;
            var end = start < Length ? Math.Min(start + PageSize, Length) : start + PageSize;
            return $"{start + 1} – {end} of {Length}";
        }
    }

    private async Task GoToAsync(int index)
    {
        index = Math.Clamp(index, 0, Math.Max(0, PageCount - 1));
        if (index == PageIndex) return;
        var previous = PageIndex;
        PageIndex = index;
        await PageIndexChanged.InvokeAsync(index);
        await Page.InvokeAsync(new PBPageEvent(index, previous, PageSize, Length));
    }

    private async Task ChangePageSizeAsync(int size)
    {
        if (size == PageSize || size <= 0) return;
        // Keep the first item of the current page visible, like MatPaginator._changePageSize.
        var startIndex = PageIndex * PageSize;
        var previous = PageIndex;
        PageSize = size;
        PageIndex = startIndex / size;
        await PageSizeChanged.InvokeAsync(size);
        await PageIndexChanged.InvokeAsync(PageIndex);
        await Page.InvokeAsync(new PBPageEvent(PageIndex, previous, size, Length));
    }
}
