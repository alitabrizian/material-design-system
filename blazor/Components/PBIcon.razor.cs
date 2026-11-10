namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>Which icon font renders a ligature name (mat-icon <c>fontSet</c>).</summary>
public enum PBIconFontSet
{
    /// <summary>"Material Icons". Kept for compatibility; components use PartoBita Icons.</summary>
    Icons,

    /// <summary>"Material Symbols Outlined" (variable weight).</summary>
    Symbols,

    /// <summary>"PartoBita Icons" (the default): the design system's own icon set (the Icons page) as a font.</summary>
    PartoBita,

    /// <summary>No icon font: child content is an SVG, image or text.</summary>
    None,
}

/// <summary>
/// mat-icon: a 24px icon from a PartoBita icon name (<c>&lt;PBIcon&gt;home-line&lt;/PBIcon&gt;</c>, the names on the
/// Icons page) or custom SVG content. PartoBita Icons is the default font set.
/// With a <c>Label</c> it is announced as an image; without one it is decorative (aria-hidden), like mat-icon.
/// All three icon fonts ship with the design system (no CDN).
/// </summary>
public partial class PBIcon : WorkspaceComponentBase
{
    [Parameter] public PBIconFontSet FontSet { get; set; } = PBIconFontSet.PartoBita;

    /// <summary>Icon color role: inherits the text color by default (mat-icon <c>color</c>).</summary>
    [Parameter] public PBIconColor Color { get; set; } = PBIconColor.Inherit;

    private string CssClass =>
        "pb-icon"
        + FontSet switch
        {
            PBIconFontSet.Icons => " material-icons",
            PBIconFontSet.Symbols => " material-symbols-outlined",
            PBIconFontSet.PartoBita => " pb-icons",
            _ => " pb-icon--custom",
        }
        + (Color == PBIconColor.Inherit ? "" : " pb-icon--" + Color.ToString().ToLowerInvariant());
}

public enum PBIconColor { Inherit, Primary, Secondary, Tertiary, Error }
