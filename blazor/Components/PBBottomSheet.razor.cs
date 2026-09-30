using Microsoft.AspNetCore.Components.Web;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// MatBottomSheet as a component: render it (conditionally) to slide a sheet up from the bottom of the
/// screen over a scrim. It takes focus when shown; Escape or a scrim click raise <see cref="Dismissed"/>.
/// </summary>
public partial class PBBottomSheet : WorkspaceComponentBase
{
    [Parameter] public EventCallback Dismissed { get; set; }

    private ElementReference sheet;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender) await DesignSystemJs.InvokeVoidAsync(JS, "focus", sheet, new { preventScroll = true });
    }

    private Task CloseAsync() => Dismissed.InvokeAsync();

    private Task OnKeyDownAsync(KeyboardEventArgs e) =>
        e.Key == "Escape" ? CloseAsync() : Task.CompletedTask;
}
