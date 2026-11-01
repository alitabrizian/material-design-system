namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// MatSnackBar's simple snack bar as a component: set <see cref="Open"/> (bind it) to show the message at the
/// top of the screen, 40px from the top and inline-end edges (Figma Motion). <see cref="Duration"/> auto-dismisses (0 = until dismissed, MatSnackBar's
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
    private bool raised;

    protected override void OnParametersSet()
    {
        if (Open && !wasOpen && Duration > 0 && !Inline)
        {
            timer?.Cancel();
            timer = new CancellationTokenSource();
            _ = DismissAfterAsync(Duration, timer.Token);
        }
        wasOpen = Open;
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (Inline) return;
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
