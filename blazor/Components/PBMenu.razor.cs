using Microsoft.AspNetCore.Components.Web;
using Microsoft.JSInterop;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>Horizontal side of the trigger the panel opens toward (mat-menu xPosition).</summary>
public enum PBMenuXPosition { Before, After }

/// <summary>Vertical side of the trigger the panel opens toward (mat-menu yPosition).</summary>
public enum PBMenuYPosition { Above, Below }

/// <summary>
/// mat-menu with its trigger button. Items are <see cref="PBMenuItem"/>s. The panel opens below the
/// trigger (flipping above when there is no room), focuses its first item, supports ArrowUp/ArrowDown/
/// Home/End, and closes on Escape, Tab, an outside click or an item click, returning focus to the trigger.
/// </summary>
public partial class PBMenu : WorkspaceComponentBase
{
    /// <summary>Content of the trigger button (e.g. an icon).</summary>
    [Parameter] public RenderFragment? Trigger { get; set; }

    /// <summary>Appearance of the trigger button; <c>Icon</c> (default) for icon triggers, <c>Text</c>/<c>Outlined</c>… for labels.</summary>
    [Parameter] public PBButtonVariant TriggerVariant { get; set; } = PBButtonVariant.Icon;

    /// <summary><c>After</c> (default) aligns the panel's start edge with the trigger's start edge; <c>Before</c> aligns the end edges.</summary>
    [Parameter] public PBMenuXPosition XPosition { get; set; } = PBMenuXPosition.After;

    [Parameter] public PBMenuYPosition YPosition { get; set; } = PBMenuYPosition.Below;

    /// <summary>Extra CSS class(es) for the overlay panel (mat-menu's <c>class</c> input).</summary>
    [Parameter] public string? PanelClass { get; set; }

    [Parameter] public bool IsOpen { get; set; }
    [Parameter] public EventCallback<bool> IsOpenChanged { get; set; }

    private readonly string PanelId = "pb-menu-" + Guid.NewGuid().ToString("N")[..8];
    private ElementReference triggerHost;
    private ElementReference panel;
    private ElementReference content;
    private DotNetObjectReference<PBMenu>? selfReference;
    private bool positioned;
    private string? focusOnOpen = "first";

    private Task ToggleAsync() => SetOpenAsync(!IsOpen);

    public Task CloseAsync() => SetOpenAsync(false, restoreFocus: true);

    [JSInvokable]
    public Task CloseFromOutside() => InvokeAsync(() => SetOpenAsync(false));

    private async Task SetOpenAsync(bool value, bool restoreFocus = false)
    {
        if (IsOpen == value) return;
        // Update state before the first await: Blazor re-renders an event handler's component when it
        // yields, and a render that still saw IsOpen with positioned = false would position the closing
        // panel again, leaving positioned stuck at true so the next open never shows the panel.
        var detach = !value && positioned;
        var closingPanel = panel;
        IsOpen = value;
        if (!value) positioned = false;
        if (detach)
        {
            await DesignSystemJs.InvokeVoidAsync(JS, "unposition", closingPanel);
        }
        await IsOpenChanged.InvokeAsync(value);
        StateHasChanged();
        if (!value && restoreFocus)
        {
            await DesignSystemJs.InvokeVoidAsync(JS, "focusFirst", triggerHost, "button");
        }
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (IsOpen && !positioned)
        {
            positioned = true;
            selfReference ??= DotNetObjectReference.Create(this);
            await DesignSystemJs.InvokeVoidAsync(JS, "position", panel, triggerHost, new
            {
                x = XPosition == PBMenuXPosition.Before ? "end" : "start",
                y = YPosition == PBMenuYPosition.Above ? "above" : "below",
                anchorClosest = ".pb-menu",
                anchorSelector = ".pb-menu__trigger-host > .pb-button",
                dotNet = selfReference,
                closeMethod = nameof(CloseFromOutside),
            });
            if (focusOnOpen == "last")
                await DesignSystemJs.InvokeVoidAsync(JS, "moveFocus", content, "[role^='menuitem']", "End");
            else
                await DesignSystemJs.InvokeVoidAsync(JS, "focusFirst", content, null);
            focusOnOpen = "first";
        }
    }

    private async Task OnTriggerKeyDownAsync(KeyboardEventArgs e)
    {
        if (!IsOpen && e.Key is "ArrowDown" or "ArrowUp")
        {
            focusOnOpen = e.Key == "ArrowUp" ? "last" : "first";
            await SetOpenAsync(true);
        }
    }

    private async Task OnKeyDownAsync(KeyboardEventArgs e)
    {
        switch (e.Key)
        {
            case "Escape":
                await CloseAsync();
                break;
            case "Tab":
                await SetOpenAsync(false);
                break;
            case "ArrowDown" or "ArrowUp" or "Home" or "End":
                await DesignSystemJs.InvokeVoidAsync(JS, "moveFocus", content, "[role^='menuitem']", e.Key);
                break;
        }
    }

    internal Task ItemActivatedAsync() => CloseAsync();

    public async ValueTask DisposeAsync()
    {
        if (positioned) await DesignSystemJs.InvokeVoidAsync(JS, "unposition", panel);
        selfReference?.Dispose();
    }
}
