using Microsoft.AspNetCore.Components.Web;

namespace Design.Components;

public partial class PBBottomSheet : WorkspaceComponentBase
{
    /// <summary>
    /// Renders as a fixed, bottom-anchored overlay (matching Angular
    /// Material's MatBottomSheet service) with a dismissible scrim behind it,
    /// instead of an inline block in the page's normal flow.
    /// </summary>
    [Parameter] public EventCallback Dismissed { get; set; }

    private Task CloseAsync() => Dismissed.InvokeAsync();

    private Task OnKeyDownAsync(KeyboardEventArgs e) =>
        e.Key == "Escape" ? CloseAsync() : Task.CompletedTask;
}
