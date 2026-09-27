namespace Design.Components;

/// <summary>
/// MatSnackBar's simple snack bar as a component: set <see cref="Open"/> (bind it) to show the message at the
/// bottom of the screen. <see cref="Duration"/> auto-dismisses (0 = until dismissed, MatSnackBar's
/// default); <see cref="ActionLabel"/> adds an action button that dismisses it. <see cref="Inline"/>
/// renders the surface in place (documentation/previews).
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
