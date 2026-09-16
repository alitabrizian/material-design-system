using Microsoft.AspNetCore.Components;

namespace Design.Components;

public abstract class WorkspaceComponentBase : ComponentBase
{
    [Parameter] public RenderFragment? ChildContent { get; set; }
    [Parameter] public string? Label { get; set; }
    [Parameter(CaptureUnmatchedValues = true)] public IReadOnlyDictionary<string, object>? AdditionalAttributes { get; set; }
}