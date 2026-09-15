using Microsoft.AspNetCore.Components;

namespace Design.Components;

public partial class DesignTextField
{
    [Parameter]
    public string? Label { get; set; }

    [Parameter]
    public string? Value { get; set; }

    [Parameter]
    public EventCallback<string?> ValueChanged { get; set; }

    [Parameter]
    public string Type { get; set; } = "text";

    [Parameter(CaptureUnmatchedValues = true)]
    public IReadOnlyDictionary<string, object>? AdditionalAttributes { get; set; }

    private async Task HandleInput(ChangeEventArgs args)
    {
        await ValueChanged.InvokeAsync(args.Value?.ToString());
    }
}