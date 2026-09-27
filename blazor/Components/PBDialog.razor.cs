using Microsoft.JSInterop;

namespace Design.Components;

/// <summary>
/// MatDialog as a component: a native modal <c>&lt;dialog&gt;</c> (top layer, focus trapped, background
/// inert) opened while <see cref="Open"/> is true. <see cref="WorkspaceComponentBase.Label"/> (or
/// <see cref="Title"/>) is mat-dialog-title, child content is mat-dialog-content, <see cref="Actions"/> is
/// mat-dialog-actions. Escape and a backdrop click close it unless <see cref="DisableClose"/>.
/// </summary>
public partial class PBDialog : WorkspaceComponentBase
{
    [Parameter] public bool Open { get; set; }
    [Parameter] public EventCallback<bool> OpenChanged { get; set; }

    [Parameter] public RenderFragment? Title { get; set; }

    [Parameter] public RenderFragment? Actions { get; set; }

    [Parameter] public bool DisableClose { get; set; }

    /// <summary>Renders the dialog surface in place, non-modal (documentation/previews).</summary>
    [Parameter] public bool Inline { get; set; }

    private readonly string TitleId = "pb-dialog-title-" + Guid.NewGuid().ToString("N")[..8];
    private ElementReference dialog;
    private DotNetObjectReference<PBDialog>? selfReference;
    private bool shown;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (Inline)
        {
            if (firstRender) await DesignSystemJs.InvokeVoidAsync(JS, "showInlineDialog", dialog);
            return;
        }
        if (Open && !shown)
        {
            shown = true;
            selfReference ??= DotNetObjectReference.Create(this);
            await DesignSystemJs.InvokeVoidAsync(JS, "showDialog", dialog, selfReference, !DisableClose);
        }
        else if (!Open && shown)
        {
            shown = false;
            await DesignSystemJs.InvokeVoidAsync(JS, "closeDialog", dialog);
        }
    }

    /// <summary>Closes the dialog (e.g. from an action button).</summary>
    public async Task CloseAsync()
    {
        if (!Open) return;
        Open = false;
        await OpenChanged.InvokeAsync(false);
        StateHasChanged();
    }

    [JSInvokable]
    public Task OnCancel() => InvokeAsync(async () =>
    {
        if (!DisableClose) await CloseAsync();
    });

    public async ValueTask DisposeAsync()
    {
        if (shown) await DesignSystemJs.InvokeVoidAsync(JS, "closeDialog", dialog);
        selfReference?.Dispose();
    }
}
