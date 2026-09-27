namespace Design.Components;

/// <summary>
/// mat-radio-group: groups <see cref="PBRadioButton"/>s under <c>role="radiogroup"</c>. Give the
/// radios a shared <c>name</c> so the browser provides arrow-key selection within the group.
/// </summary>
public partial class PBRadioGroup : WorkspaceComponentBase
{
    /// <summary>Stacks the options vertically instead of flowing them in a row.</summary>
    [Parameter] public bool Vertical { get; set; }
}
