namespace Design.Components;

public partial class DesignCheckbox
{
    [Parameter] public string? Label { get; set; }
    [Parameter] public bool Checked { get; set; }
    [Parameter] public EventCallback<bool> CheckedChanged { get; set; }
    [Parameter(CaptureUnmatchedValues = true)] public IReadOnlyDictionary<string, object>? AdditionalAttributes { get; set; }

    private Task HandleChange(ChangeEventArgs args) =>
        CheckedChanged.InvokeAsync(args.Value is bool value && value);
}