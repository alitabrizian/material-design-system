namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// mat-progress-spinner. Indeterminate by default; set <see cref="Value"/> (0-100) for determinate.
/// Geometry follows MatProgressSpinner: radius = (diameter - 10) / 2, viewBox = 2 * radius + stroke.
/// </summary>
public partial class PBProgressSpinner : WorkspaceComponentBase
{
    /// <summary>Size in pixels (mat-progress-spinner <c>diameter</c>); 48px is the M3 default.</summary>
    [Parameter] public int Diameter { get; set; } = 48;

    /// <summary>Stroke width in pixels; defaults to M3's 4px active-indicator width (scaled down for tiny spinners).</summary>
    [Parameter] public double? StrokeWidth { get; set; }

    /// <summary>0-100 for a determinate spinner; null (default) spins indeterminately.</summary>
    [Parameter] public double? Value { get; set; }

    private bool IsIndeterminate => Value is null;

    private double Stroke => StrokeWidth ?? Math.Min(4, Diameter / 10.0);

    private double Radius => Math.Max(1, (Diameter - 10) / 2.0);

    private double ViewBox => Radius * 2 + Stroke;

    private double Circumference => 2 * Math.PI * Radius;

    private double DeterminateOffset => Circumference * (100 - Math.Clamp(Value ?? 0, 0, 100)) / 100;
}
