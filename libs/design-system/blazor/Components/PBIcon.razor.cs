namespace Design.Components;

/// <summary>Which icon font renders a ligature name (mat-icon <c>fontSet</c>).</summary>
public enum PBIconFontSet
{
    /// <summary>"Material Icons" (mat-icon's default).</summary>
    Icons,

    /// <summary>"Material Symbols Outlined" (variable weight).</summary>
    Symbols,

    /// <summary>No icon font: child content is an SVG, image or text.</summary>
    None,
}

/// <summary>
/// mat-icon: a 24px icon from a ligature name (<c>&lt;PBIcon&gt;home&lt;/PBIcon&gt;</c>) or custom SVG content.
/// With a <c>Label</c> it is announced as an image; without one it is decorative (aria-hidden), like mat-icon.
/// Both icon fonts ship with the design system (no CDN).
/// </summary>
public partial class PBIcon : WorkspaceComponentBase
{
    [Parameter] public PBIconFontSet FontSet { get; set; } = PBIconFontSet.Icons;

    /// <summary>Icon color role: inherits the text color by default (mat-icon <c>color</c>).</summary>
    [Parameter] public PBIconColor Color { get; set; } = PBIconColor.Inherit;

    private string CssClass =>
        "pb-icon"
        + FontSet switch
        {
            PBIconFontSet.Icons => " material-icons",
            PBIconFontSet.Symbols => " material-symbols-outlined",
            _ => " pb-icon--custom",
        }
        + (Color == PBIconColor.Inherit ? "" : " pb-icon--" + Color.ToString().ToLowerInvariant());
}

public enum PBIconColor { Inherit, Primary, Secondary, Tertiary, Error }
