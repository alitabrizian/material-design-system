namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// MatSnackBar's simple snack bar as a component: set <see cref="Open"/> (bind it) to show the message at the
/// top of the screen, 40px from the top and right edges, moving in downwards and back up when it closes (Figma Motion). <see cref="Duration"/> auto-dismisses (0 = until dismissed, MatSnackBar's
/// default); <see cref="ActionLabel"/> adds an action button that dismisses it. <see cref="Inline"/>
/// renders the surface in place (documentation/previews). The container is an always-open manual popover on
/// the snackbar layer (Figma Layering), so the message shows above menus, dialogs and tooltips.
/// </summary>
public partial class PBSnackbar : WorkspaceComponentBase
{
    [Parameter] public bool Open { get; set; }
    [Parameter] public EventCallback<bool> OpenChanged { get; set; }

    [Parameter] public int Duration { get; set; }

    [Parameter] public string? ActionLabel { get; set; }
    [Parameter] public EventCallback OnAction { get; set; }

    [Parameter] public bool Inline { get; set; }

    private CancellationTokenSource? timer;
    private bool wasOpen;
    private ElementReference container;
    private ElementReference surface;
    private bool raised;
    // The surface is rendered while open and, after closing, until its closing motion has played.
    private bool shown;
    private bool exitPending;

    protected override void OnParametersSet()
    {
        if (Open && !wasOpen && Duration > 0 && !Inline)
        {
            timer?.Cancel();
            timer = new CancellationTokenSource();
            _ = DismissAfterAsync(Duration, timer.Token);
        }
        wasOpen = Open;
        if (Open) shown = true;
        else if (shown) exitPending = true;
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (Inline) return;
        if (exitPending)
        {
            // Figma Motion: the closing motion (the 500ms move in, reversed) plays before the surface goes.
            exitPending = false;
            await DesignSystemJs.InvokeVoidAsync(JS, "playExit", surface, null);
            if (!Open && shown)
            {
                shown = false;
                StateHasChanged();
            }
        }
        // Shown (empty) from the first render, so it stays a live region; raised to the top of the top layer
        // each time a message appears, above any menu or dialog opened since.
        if (firstRender || (Open && !raised))
        {
            raised = Open;
            await DesignSystemJs.InvokeVoidAsync(JS, "raiseLayer", container);
        }
        else if (!Open)
        {
            raised = false;
        }
    }

    private async Task DismissAfterAsync(int ms, CancellationToken token)
    {
        try
        {
            await Task.Delay(ms, token);
            await InvokeAsync(CloseAsync);
        }
        catch (TaskCanceledException)
        {
        }
    }

    private async Task CloseAsync()
    {
        timer?.Cancel();
        if (!Open) return;
        Open = false;
        wasOpen = false;
        exitPending = shown;
        await OpenChanged.InvokeAsync(false);
        StateHasChanged();
    }

    private async Task OnActionAsync()
    {
        await OnAction.InvokeAsync();
        await CloseAsync();
    }

    public void Dispose() => timer?.Cancel();
}
