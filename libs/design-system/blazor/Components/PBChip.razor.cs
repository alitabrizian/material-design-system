using Microsoft.AspNetCore.Components.Web;

namespace Design.Components;

/// <summary>
/// <c>Assist</c> = mat-chip (optionally clickable), <c>Filter</c> = mat-chip-option (toggles
/// <see cref="PBChip.Selected"/>, shows a checkmark), <c>Input</c> = mat-chip-row (represents an
/// entered value, usually <see cref="PBChip.Removable"/>).
/// </summary>
public enum PBChipVariant { Assist, Filter, Input }

/// <summary>A chip inside <see cref="PBChips"/>.</summary>
public partial class PBChip : WorkspaceComponentBase
{
    [Parameter] public PBChipVariant Variant { get; set; } = PBChipVariant.Assist;

    [Parameter] public bool Selected { get; set; }
    [Parameter] public EventCallback<bool> SelectedChanged { get; set; }

    /// <summary>Leading 18px icon (matChipAvatar / leading icon).</summary>
    [Parameter] public RenderFragment? Icon { get; set; }

    /// <summary>Shows a trailing remove button (matChipRemove).</summary>
    [Parameter] public bool Removable { get; set; }

    [Parameter] public EventCallback OnRemove { get; set; }

    /// <summary>Click handler for assist chips.</summary>
    [Parameter] public EventCallback<MouseEventArgs> OnClick { get; set; }

    [Parameter] public bool Disabled { get; set; }

    /// <summary>Tonal fill without selection semantics (mat-chip <c>highlighted</c>).</summary>
    [Parameter] public bool Highlighted { get; set; }

    private bool IsInteractive => Variant == PBChipVariant.Filter || OnClick.HasDelegate;

    private bool HasGraphic => Icon is not null || Variant == PBChipVariant.Filter;

    private string HostRole => Variant == PBChipVariant.Filter ? "option" : "listitem";

    private string CssClass =>
        "pb-chip pb-chip--" + Variant.ToString().ToLowerInvariant()
        + (HasGraphic ? " pb-chip--with-graphic" : "")
        + (Icon is not null ? " pb-chip--with-icon" : "")
        + (Removable ? " pb-chip--with-trailing" : "")
        + (Selected && Variant == PBChipVariant.Filter ? " pb-chip--selected" : "")
        + (Highlighted ? " pb-chip--highlighted" : "")
        + (Disabled ? " pb-chip--disabled" : "");

    private async Task OnPrimaryClickAsync(MouseEventArgs e)
    {
        if (Variant == PBChipVariant.Filter)
        {
            Selected = !Selected;
            await SelectedChanged.InvokeAsync(Selected);
        }
        await OnClick.InvokeAsync(e);
    }
}
