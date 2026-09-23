namespace Design.Components;

public enum PBStepperOrientation { Horizontal, Vertical }

public partial class PBStepper : WorkspaceComponentBase
{
    [Parameter] public PBStepperOrientation Orientation { get; set; } = PBStepperOrientation.Horizontal;
}
