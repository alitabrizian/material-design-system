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

    /// <summary>Renders an <c>&lt;a&gt;</c> styled as this button instead of a <c>&lt;button&gt;</c>, like <c>a[matButton]</c>.</summary>
    [Parameter] public string? Href { get; set; }

    [Parameter] public bool Disabled { get; set; }

    /// <summary>
    /// Keeps a disabled button focusable and hoverable (so e.g. a tooltip can explain why it is
    /// disabled) while still blocking clicks, like Angular Material's <c>disabledInteractive</c>.
    /// Uses <c>aria-disabled</c> instead of the native <c>disabled</c> attribute.
    /// </summary>
    [Parameter] public bool DisabledInteractive { get; set; }

    /// <summary>Hides the label and icons and shows <see cref="ProgressIndicator"/> in their place, keeping the button's size.</summary>
    [Parameter] public bool ShowProgress { get; set; }

    /// <summary>What to show while <see cref="ShowProgress"/> is set, typically a small <c>PBProgressSpinner</c>.</summary>
    [Parameter] public RenderFragment? ProgressIndicator { get; set; }

    private string CssClass =>
        $"pb-button pb-button--{VariantClass} pb-interactive pb-ripple-host"
        + (Variant == PBButtonVariant.Icon ? " pb-ripple-centered" : "")
        + (Disabled ? " pb-button--disabled" : "")
        + (Disabled && DisabledInteractive ? " pb-button--disabled-interactive" : "")
        + (ShowProgress ? " pb-button--progress" : "")
        + (UserClass is null ? "" : " " + UserClass);

    // A disabled link or interactive-disabled button is not natively disabled, so drop the
    // consumer's click handler to block activation the way the native attribute would.
    private IEnumerable<KeyValuePair<string, object>>? ForwardedAttributes =>
        Disabled ? Attrs?.Where(a => !a.Key.Equals("onclick", StringComparison.OrdinalIgnoreCase)) : Attrs;

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
