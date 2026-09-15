using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;

namespace Design.Components;

public partial class DesignButton
{
    [Parameter]
    public RenderFragment? ChildContent { get; set; }

    [Parameter]
    public EventCallback<MouseEventArgs> OnClick { get; set; }

    [Parameter]
    public bool Disabled { get; set; }

    [Parameter]
    public string Type { get; set; } = "button";

    [Parameter]
    public string Variant { get; set; } = "Filled";

    [Parameter(CaptureUnmatchedValues = true)]
    public IReadOnlyDictionary<string, object>? AdditionalAttributes { get; set; }
}