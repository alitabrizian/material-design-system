namespace Design.Components;

public enum PBSortDirection { None, Ascending, Descending }

public enum PBSortArrowPosition { After, Before }

/// <summary>
/// mat-sort-header. Clicking cycles ascending → descending → none (like MatSort's default
/// <c>disableClear=false</c>) and raises <see cref="DirectionChanged"/>. Put
/// <c>aria-sort</c> on the enclosing <c>&lt;th&gt;</c> from the same direction.
/// </summary>
public partial class PBSortHeader : WorkspaceComponentBase
{
    [Parameter] public PBSortDirection Direction { get; set; }
    [Parameter] public EventCallback<PBSortDirection> DirectionChanged { get; set; }

    [Parameter] public PBSortArrowPosition ArrowPosition { get; set; } = PBSortArrowPosition.After;

    /// <summary>Skips the "no sort" state when cycling (MatSort <c>disableClear</c>).</summary>
    [Parameter] public bool DisableClear { get; set; }

    [Parameter] public bool Disabled { get; set; }

    private string CssClass =>
        "pb-sort-header"
        + (ArrowPosition == PBSortArrowPosition.Before ? " pb-sort-header--before" : "")
        + (Direction != PBSortDirection.None ? " pb-sort-header--sorted" : "")
        + (Direction == PBSortDirection.Descending ? " pb-sort-header--descending" : "");

    private string AriaLabel => Direction switch
    {
        PBSortDirection.Ascending => $"{Label}, sorted ascending. Change sorting",
        PBSortDirection.Descending => $"{Label}, sorted descending. Change sorting",
        _ => $"Sort by {Label}",
    };

    private async Task OnClickAsync()
    {
        var next = Direction switch
        {
            PBSortDirection.None => PBSortDirection.Ascending,
            PBSortDirection.Ascending => PBSortDirection.Descending,
            _ => DisableClear ? PBSortDirection.Ascending : PBSortDirection.None,
        };
        Direction = next;
        await DirectionChanged.InvokeAsync(next);
    }
}
