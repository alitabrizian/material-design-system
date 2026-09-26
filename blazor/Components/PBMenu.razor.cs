using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;

namespace Design.Components;

/// <summary>Horizontal side of the trigger the panel opens toward (mirrors mat-menu's xPosition).</summary>
public enum PBMenuXPosition { Before, After }

public partial class PBMenu : WorkspaceComponentBase
{
    /// <summary>The button/icon content that opens the menu.</summary>
    [Parameter] public RenderFragment? Trigger { get; set; }

    /// <summary>
    /// <c>After</c> (default) aligns the panel's start edge with the trigger's start edge, so it
    /// extends toward the inline end; <c>Before</c> aligns the end edges, so it extends toward the start.
    /// </summary>
    [Parameter] public PBMenuXPosition XPosition { get; set; } = PBMenuXPosition.After;

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
