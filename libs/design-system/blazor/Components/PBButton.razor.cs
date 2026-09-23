using Microsoft.AspNetCore.Components;

namespace Design.Components;

/// <summary>
/// The five Material 3 button appearances (m3.material.io/components/buttons),
/// plus the icon button and the three FAB shapes
/// (m3.material.io/components/floating-action-button).
/// </summary>
public enum PBButtonVariant
{
    Text,
    Filled,
    Tonal,
    Outlined,
    Elevated,
    Icon,
    Fab,
    MiniFab,
    ExtendedFab,
}

public partial class PBButton : WorkspaceComponentBase
{
    [Parameter] public PBButtonVariant Variant { get; set; } = PBButtonVariant.Text;

    [Parameter] public string Type { get; set; } = "button";

    /// <summary>Icon projected before the label (matches Angular Material's default icon slot).</summary>
    [Parameter] public RenderFragment? IconStart { get; set; }

    /// <summary>Icon projected after the label (Angular Material's <c>iconPositionEnd</c>).</summary>
    [Parameter] public RenderFragment? IconEnd { get; set; }

    private string VariantClass => Variant switch
    {
        PBButtonVariant.Filled => "filled",
        PBButtonVariant.Tonal => "tonal",
        PBButtonVariant.Outlined => "outlined",
        PBButtonVariant.Elevated => "elevated",
        PBButtonVariant.Icon => "icon",
        PBButtonVariant.Fab => "fab",
        PBButtonVariant.MiniFab => "fab-mini",
        PBButtonVariant.ExtendedFab => "fab-extended",
        _ => "text",
    };
}
