using System.Globalization;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// mat-grid-list: a two-dimensional list of <see cref="PBGridTile"/>s in <see cref="Cols"/> equal columns.
/// <see cref="RowHeight"/> is either a fixed CSS length (<c>"100px"</c>) or a width:height ratio
/// (<c>"4:3"</c>, default <c>"1:1"</c>) of a single column, like Angular Material's <c>rowHeight</c>.
/// </summary>
public partial class PBGridList : WorkspaceComponentBase
{
    [Parameter] public int Cols { get; set; } = 2;

    [Parameter] public string RowHeight { get; set; } = "1:1";

    /// <summary>Space between tiles (mat-grid-list <c>gutterSize</c>, default 1px).</summary>
    [Parameter] public string Gutter { get; set; } = "1px";

    private string Style
    {
        get
        {
            var cols = Math.Max(1, Cols);
            var rowHeight = RowHeight.Contains(':')
                ? RatioRowHeight(cols)
                : RowHeight;
            return $"--pb-grid-cols:{cols};--pb-grid-gutter:{Gutter};--pb-grid-row-height:{rowHeight};";
        }
    }

    // Ratio rows are sized from the list's own width (container query units), so they stay correct
    // at every viewport width without JS: (width - gutters) / cols / ratio.
    private string RatioRowHeight(int cols)
    {
        var parts = RowHeight.Split(':');
        var ratio = double.Parse(parts[0], CultureInfo.InvariantCulture) / double.Parse(parts[1], CultureInfo.InvariantCulture);
        var r = ratio.ToString("0.#####", CultureInfo.InvariantCulture);
        return $"calc((100cqw - {cols - 1} * {Gutter}) / {cols} / {r})";
    }
}
