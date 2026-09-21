using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;

namespace Design.Components;

public partial class PBMenu : WorkspaceComponentBase
{
    /// <summary>The button/icon content that opens the menu.</summary>
    [Parameter] public RenderFragment? Trigger { get; set; }

    [Parameter] public bool IsOpen { get; set; }
    [Parameter] public EventCallback<bool> IsOpenChanged { get; set; }

    private Task ToggleAsync() => SetOpenAsync(!IsOpen);

    private Task CloseAsync() => SetOpenAsync(false);

    private async Task SetOpenAsync(bool value)
    {
        IsOpen = value;
        await IsOpenChanged.InvokeAsync(value);
    }

    private Task OnKeyDownAsync(KeyboardEventArgs e) =>
        e.Key == "Escape" ? CloseAsync() : Task.CompletedTask;
}
