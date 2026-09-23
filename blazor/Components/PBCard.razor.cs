namespace Design.Components;

public enum PBCardVariant { Elevated, Filled, Outlined }

public partial class PBCard : WorkspaceComponentBase
{
    [Parameter] public PBCardVariant Variant { get; set; } = PBCardVariant.Outlined;
}
