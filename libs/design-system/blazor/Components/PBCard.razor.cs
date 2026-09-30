namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>mat-card appearances. <c>Elevated</c> is Angular Material's default ("raised").</summary>
public enum PBCardVariant { Elevated, Filled, Outlined }

/// <summary>
/// mat-card. Compose it like Angular Material: <see cref="PBCardHeader"/>, <see cref="PBCardContent"/>
/// and <see cref="PBCardActions"/> supply the standard paddings; the card itself has none.
/// </summary>
public partial class PBCard : WorkspaceComponentBase
{
    [Parameter] public PBCardVariant Variant { get; set; } = PBCardVariant.Elevated;
}
