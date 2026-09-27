using Microsoft.AspNetCore.Components.Web;

namespace Design.Components;

public enum PBStepperOrientation { Horizontal, Vertical }

/// <summary>
/// mat-stepper. Declare <see cref="PBStep"/>s as child content. Steps before the selected one count
/// as completed unless <see cref="PBStep.Completed"/> says otherwise; with <see cref="Linear"/>, a step
/// can only be selected once all previous steps are completed. Use <see cref="NextAsync"/> /
/// <see cref="PreviousAsync"/> from buttons in step content (matStepperNext / matStepperPrevious).
/// </summary>
public partial class PBStepper : WorkspaceComponentBase
{
    [Parameter] public PBStepperOrientation Orientation { get; set; } = PBStepperOrientation.Horizontal;

    [Parameter] public int SelectedIndex { get; set; }
    [Parameter] public EventCallback<int> SelectedIndexChanged { get; set; }

    [Parameter] public bool Linear { get; set; }

    private readonly List<PBStep> steps = [];
    private readonly string id = Guid.NewGuid().ToString("N")[..8];
    private ElementReference headerContainer;

    private string HeaderId(int index) => $"pb-step-header-{id}-{index}";
    private string PanelId(int index) => $"pb-step-content-{id}-{index}";

    internal void Register(PBStep step)
    {
        steps.Add(step);
        StateHasChanged();
    }

    internal void Unregister(PBStep step)
    {
        steps.Remove(step);
        StateHasChanged();
    }

    internal void Refresh() => InvokeAsync(StateHasChanged);

    public int Count => steps.Count;

    public Task NextAsync() => SelectAsync(SelectedIndex + 1);

    public Task PreviousAsync() => SelectAsync(SelectedIndex - 1);

    public async Task ResetAsync()
    {
        foreach (var step in steps) step.Interacted = false;
        await SelectAsync(0, force: true);
    }

    private bool IsCompleted(int index) =>
        steps[index].Completed ?? (steps[index].Interacted && index != SelectedIndex);

    private bool CanSelect(int index) =>
        !Linear || Enumerable.Range(0, index).All(i => IsCompleted(i) || steps[i].Optional);

    private string StateOf(int index)
    {
        var step = steps[index];
        if (step.HasError && index != SelectedIndex) return "error";
        if (index == SelectedIndex) return "selected";
        if (IsCompleted(index)) return step.Editable ? "edit" : "done";
        return "number";
    }

    private async Task SelectAsync(int index, bool force = false)
    {
        if (index < 0 || index >= steps.Count || index == SelectedIndex) return;
        if (!force && !CanSelect(index)) return;
        if (!force && index > SelectedIndex && SelectedIndex >= 0 && SelectedIndex < steps.Count)
        {
            steps[SelectedIndex].Interacted = true;
        }
        if (!force && index < SelectedIndex && !steps[index].Editable && IsCompleted(index)) return;
        SelectedIndex = index;
        await SelectedIndexChanged.InvokeAsync(index);
        StateHasChanged();
    }

    private async Task OnKeyDownAsync(KeyboardEventArgs e)
    {
        if (e.Key is "ArrowLeft" or "ArrowRight" or "ArrowUp" or "ArrowDown" or "Home" or "End")
        {
            await DesignSystemJs.InvokeVoidAsync(JS, "moveFocus", headerContainer, "[role='tab']", e.Key);
        }
    }
}
