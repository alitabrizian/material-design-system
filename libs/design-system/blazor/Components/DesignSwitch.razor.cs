using Microsoft.AspNetCore.Components;

namespace Design.Components;

public partial class DesignSwitch
{
    [Parameter] public string? Label { get; set; }
    [Parameter] public bool Selected { get; set; }
    [Parameter] public EventCallback<bool> SelectedChanged { get; set; }
    [Parameter(CaptureUnmatchedValues = true)] public IReadOnlyDictionary<string, object>? AdditionalAttributes { get; set; }

    private Task HandleChange(ChangeEventArgs args) =>
        SelectedChanged.InvokeAsync(args.Value is bool value && value);
}