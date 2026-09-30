namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// mat-list-item. Title is <see cref="Title"/> and/or child content; <see cref="Subtitle"/> and
/// <see cref="Line3"/> add the second and third lines (matListItemLine). Setting <see cref="Href"/>
/// renders a link (mat-nav-list), <see cref="OnClick"/> a button (mat-action-list); both get the
/// M3 state layer.
/// </summary>
public partial class PBListItem : WorkspaceComponentBase
{
    [Parameter] public string? Title { get; set; }

    [Parameter] public string? Subtitle { get; set; }

    [Parameter] public string? Line3 { get; set; }

    /// <summary>Forces the item height (1, 2 or 3 lines, like <c>lines</c> on mat-list-item). Inferred when 0.</summary>
    [Parameter] public int Lines { get; set; }

    /// <summary>Leading 24px icon (matListItemIcon).</summary>
    [Parameter] public RenderFragment? Icon { get; set; }

    /// <summary>Leading 40px avatar (matListItemAvatar), e.g. an &lt;img&gt; or initials.</summary>
    [Parameter] public RenderFragment? Avatar { get; set; }

    /// <summary>Trailing supporting text such as a time (matListItemMeta text).</summary>
    [Parameter] public string? Meta { get; set; }

    /// <summary>Trailing content such as an icon or icon button (matListItemMeta).</summary>
    [Parameter] public RenderFragment? Trailing { get; set; }

    [Parameter] public string? Href { get; set; }

    [Parameter] public EventCallback<Microsoft.AspNetCore.Components.Web.MouseEventArgs> OnClick { get; set; }

    [Parameter] public bool Disabled { get; set; }

    /// <summary>Marks the activated item of a navigation list (tonal pill, <c>aria-current="page"</c>).</summary>
    [Parameter] public bool Selected { get; set; }

    private bool IsInteractive => Href is not null || OnClick.HasDelegate;

    private int LineCount => Lines > 0 ? Lines : Line3 is not null ? 3 : Subtitle is not null ? 2 : 1;

    private string CssClass =>
        "pb-list-item"
        + LineCount switch { 3 => " pb-list-item--three-lines", 2 => " pb-list-item--two-lines", _ => "" }
        + (IsInteractive ? " pb-list-item--interactive pb-interactive pb-ripple-host" : "")
        + (Selected ? " pb-list-item--selected" : "")
        + (Disabled ? " pb-list-item--disabled" : "");
}
