using Microsoft.AspNetCore.Components.Web;

namespace Design.Components;

/// <summary>
/// One option inside a <see cref="PBButtonToggleGroup"/> (like Angular Material's mat-button-toggle).
/// Outside a group it works as a standalone toggle via <see cref="Checked"/>.
/// </summary>
public partial class PBButtonToggle : WorkspaceComponentBase
{
    [CascadingParameter] private PBButtonToggleGroup? Group { get; set; }

    /// <summary>Identifies this option within its group.</summary>
    [Parameter] public string Value { get; set; } = string.Empty;

    [Parameter] public bool Disabled { get; set; }

    /// <summary>Checked state when used standalone; inside a group the group owns selection.</summary>
    [Parameter] public bool Checked { get; set; }
    [Parameter] public EventCallback<bool> CheckedChanged { get; set; }

    private ElementReference button;

    internal bool IsDisabled => Disabled || Group?.Disabled == true;

    private bool IsChecked => Group?.IsSelected(Value) ?? Checked;

    private bool IsRadio => Group is { Multiple: false };

    // Like mat-button-toggle, the checkmark only exists inside a group, and the group can hide it.
    private bool ShowsIndicator => Group?.ShowsIndicator == true;

    protected override void OnInitialized() => Group?.Register(this);

    internal void Refresh() => InvokeAsync(StateHasChanged);

    internal ValueTask FocusAsync() => button.FocusAsync();

    private async Task OnClickAsync()
    {
        if (Group is not null)
        {
            await Group.ToggleAsync(Value);
            return;
        }
        Checked = !Checked;
        await CheckedChanged.InvokeAsync(Checked);
    }

    private Task OnKeyDownAsync(KeyboardEventArgs e)
    {
        if (!IsRadio) return Task.CompletedTask;
        return e.Key switch
        {
            "ArrowRight" or "ArrowDown" => Group!.MoveAsync(this, 1),
            "ArrowLeft" or "ArrowUp" => Group!.MoveAsync(this, -1),
            _ => Task.CompletedTask,
        };
    }

    public void Dispose() => Group?.Unregister(this);
}
