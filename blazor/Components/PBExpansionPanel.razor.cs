namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// mat-expansion-panel. <see cref="WorkspaceComponentBase.Label"/> (or <see cref="Title"/>) is the header
/// title; <see cref="Description"/> the secondary header text. Inside a <see cref="PBAccordion"/> without
/// <see cref="PBAccordion.Multi"/>, opening one panel closes the others.
/// </summary>
public partial class PBExpansionPanel : WorkspaceComponentBase, IDisposable
{
    [CascadingParameter] private PBAccordion? Accordion { get; set; }

    /// <summary>Header title content (mat-panel-title), used instead of or after <c>Label</c>.</summary>
    [Parameter] public RenderFragment? Title { get; set; }

    /// <summary>mat-panel-description.</summary>
    [Parameter] public RenderFragment? Description { get; set; }

    /// <summary>mat-action-row: buttons under a divider at the bottom of the expanded panel.</summary>
    [Parameter] public RenderFragment? Actions { get; set; }

    [Parameter] public bool Expanded { get; set; }
    [Parameter] public EventCallback<bool> ExpandedChanged { get; set; }

    [Parameter] public bool Disabled { get; set; }

    [Parameter] public bool HideToggle { get; set; }

    private readonly string id = Guid.NewGuid().ToString("N")[..8];
    private string HeaderId => $"pb-expansion-header-{id}";
    private string BodyId => $"pb-expansion-body-{id}";

    private bool IsExpanded => Expanded;

    protected override void OnInitialized() => Accordion?.Register(this);

    internal async Task SetExpandedAsync(bool value)
    {
        if (Expanded == value) return;
        Expanded = value;
        await ExpandedChanged.InvokeAsync(value);
        await InvokeAsync(StateHasChanged);
    }

    private async Task ToggleAsync()
    {
        var next = !Expanded;
        if (next && Accordion is not null) await Accordion.CollapseOthersAsync(this);
        await SetExpandedAsync(next);
    }

    public void Dispose() => Accordion?.Unregister(this);
}
