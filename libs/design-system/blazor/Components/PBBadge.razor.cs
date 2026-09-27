namespace Design.Components;

/// <summary><c>Dot</c> hides the text (same as <see cref="PBBadgeSize.Small"/>).</summary>
public enum PBBadgeVariant { Standard, Dot }

/// <summary>matBadgeSize. M3: small is a 6px dot, medium and large are 16px.</summary>
public enum PBBadgeSize { Small, Medium, Large }

/// <summary>matBadgePosition.</summary>
public enum PBBadgePosition { AboveAfter, AboveBefore, BelowAfter, BelowBefore }

/// <summary>
/// matBadge: wraps its host content (child content) and pins a small error-colored badge showing
/// <see cref="Content"/> to one of its corners. Give it a <see cref="Description"/> for screen readers
/// (the badge itself is aria-hidden, like matBadgeDescription).
/// </summary>
public partial class PBBadge : WorkspaceComponentBase
{
    /// <summary>The badge text (matBadge), e.g. a count.</summary>
    [Parameter] public string? Content { get; set; }

    [Parameter] public PBBadgeVariant Variant { get; set; } = PBBadgeVariant.Standard;

    [Parameter] public PBBadgeSize Size { get; set; } = PBBadgeSize.Medium;

    [Parameter] public PBBadgePosition Position { get; set; } = PBBadgePosition.AboveAfter;

    /// <summary>Overlaps the host's corner (matBadgeOverlap, on by default). Turn off for text hosts.</summary>
    [Parameter] public bool Overlap { get; set; } = true;

    /// <summary>Kept for compatibility: an overlaid badge is the default.</summary>
    [Parameter] public bool Overlay { get; set; } = true;

    [Parameter] public bool Hidden { get; set; }

    [Parameter] public bool Disabled { get; set; }

    /// <summary>Screen-reader text for the badge (matBadgeDescription).</summary>
    [Parameter] public string? Description { get; set; }

    private string CssClass =>
        "pb-badge"
        + (Size == PBBadgeSize.Small || Variant == PBBadgeVariant.Dot ? " pb-badge--small" : Size == PBBadgeSize.Large ? " pb-badge--large" : " pb-badge--medium")
        + (Position is PBBadgePosition.BelowAfter or PBBadgePosition.BelowBefore ? " pb-badge--below" : " pb-badge--above")
        + (Position is PBBadgePosition.AboveBefore or PBBadgePosition.BelowBefore ? " pb-badge--before" : " pb-badge--after")
        + (Overlap && Overlay ? " pb-badge--overlap" : "")
        + (ChildContent is null ? " pb-badge--standalone" : "")
        + (Hidden ? " pb-badge--hidden" : "")
        + (Disabled ? " pb-badge--disabled" : "");
}
