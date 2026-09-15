namespace Design.Components;

public partial class DesignFab
{
    [Parameter] public string Label { get; set; } = "Action";
    [Parameter] public string Icon { get; set; } = "+";
    [Parameter] public EventCallback<MouseEventArgs> OnClick { get; set; }
    [Parameter(CaptureUnmatchedValues = true)] public IReadOnlyDictionary<string, object>? AdditionalAttributes { get; set; }
}