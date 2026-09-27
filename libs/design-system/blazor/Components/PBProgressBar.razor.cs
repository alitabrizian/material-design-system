namespace Design.Components;

/// <summary>mat-progress-bar: determinate (<see cref="Value"/> 0-100), buffer (<see cref="BufferValue"/>) or indeterminate.</summary>
public partial class PBProgressBar : WorkspaceComponentBase
{
    [Parameter] public double Value { get; set; }

    [Parameter] public bool Indeterminate { get; set; }

    /// <summary>0-100. Shows the buffer bar up to this value and animated dots after it (mat-progress-bar mode="buffer").</summary>
    [Parameter] public double? BufferValue { get; set; }
}
