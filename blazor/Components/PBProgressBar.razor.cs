namespace Design.Components;

public partial class PBProgressBar : WorkspaceComponentBase
{
    [Parameter] public double Value { get; set; }
    [Parameter] public bool Indeterminate { get; set; }

    /// <summary>0-100. When set, renders a lighter "buffered" track segment behind the main value (e.g. video buffering).</summary>
    [Parameter] public double? BufferValue { get; set; }
}
