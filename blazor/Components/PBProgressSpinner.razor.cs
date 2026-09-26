namespace Design.Components;

public partial class PBProgressSpinner : WorkspaceComponentBase
{
    /// <summary>Spinner size in pixels, like mat-progress-spinner's <c>diameter</c>.</summary>
    [Parameter] public int Diameter { get; set; } = 40;

    // The ring's stroke scales with the size, never thinner than 2px.
    private string SizeStyle => $"width:{Diameter}px;height:{Diameter}px;border-width:{Math.Max(2, Diameter / 12)}px";
}
