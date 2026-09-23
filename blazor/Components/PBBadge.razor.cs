namespace Design.Components;

public enum PBBadgeVariant { Standard, Dot }

public enum PBBadgeSize { Small, Medium, Large }

public partial class PBBadge : WorkspaceComponentBase
{
    [Parameter] public PBBadgeVariant Variant { get; set; } = PBBadgeVariant.Standard;

    [Parameter] public PBBadgeSize Size { get; set; } = PBBadgeSize.Medium;

    /// <summary>
    /// When true, the badge positions itself in the top-right corner of its
    /// nearest `position: relative` ancestor -- wrap the anchored element
    /// (e.g. an icon or button) and this badge together in such a container.
    /// </summary>
    [Parameter] public bool Overlay { get; set; }
}
