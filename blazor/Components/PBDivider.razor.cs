namespace Design.Components;

/// <summary>mat-divider: a 1px outline-variant rule.</summary>
public partial class PBDivider : WorkspaceComponentBase
{
    [Parameter] public bool Vertical { get; set; }

    /// <summary>Indents a horizontal divider by 80px, to line up with list text after an avatar (mat-divider [inset]).</summary>
    [Parameter] public bool Inset { get; set; }
}
