namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// Groups <see cref="PBButtonToggle"/>s into one connected control and owns the selection,
/// like Angular Material's mat-button-toggle-group: single selection (a radio group, bind
/// <see cref="Value"/>) or, with <see cref="Multiple"/>, independent toggles (bind <see cref="Values"/>).
/// </summary>
public partial class PBButtonToggleGroup : WorkspaceComponentBase
{
    [Parameter] public bool Multiple { get; set; }

    /// <summary>The selected toggle's value in single-selection mode.</summary>
    [Parameter] public string? Value { get; set; }
    [Parameter] public EventCallback<string?> ValueChanged { get; set; }

    /// <summary>The selected toggles' values when <see cref="Multiple"/> is set.</summary>
    [Parameter] public IReadOnlyList<string>? Values { get; set; }
    [Parameter] public EventCallback<IReadOnlyList<string>> ValuesChanged { get; set; }

    [Parameter] public bool Disabled { get; set; }

    /// <summary>Hides the checkmark on the selected toggle in single-selection mode.</summary>
    [Parameter] public bool HideSingleSelectionIndicator { get; set; }

    /// <summary>Hides the checkmark on selected toggles when <see cref="Multiple"/> is set.</summary>
    [Parameter] public bool HideMultipleSelectionIndicator { get; set; }

    private readonly List<PBButtonToggle> toggles = [];

    internal bool ShowsIndicator => Multiple ? !HideMultipleSelectionIndicator : !HideSingleSelectionIndicator;

    internal void Register(PBButtonToggle toggle) => toggles.Add(toggle);

    internal void Unregister(PBButtonToggle toggle) => toggles.Remove(toggle);

    internal bool IsSelected(string value) => Multiple ? Values?.Contains(value) == true : Value == value;

    /// <summary>
    /// In single-selection mode only one toggle is in the tab order (roving tabindex): the
    /// selected one, or the first enabled one when nothing is selected yet.
    /// </summary>
    internal bool IsTabStop(PBButtonToggle toggle)
    {
        if (Multiple) return true;
        var selected = toggles.FirstOrDefault(t => IsSelected(t.Value) && !t.IsDisabled);
        return toggle == (selected ?? toggles.FirstOrDefault(t => !t.IsDisabled));
    }

    internal async Task ToggleAsync(string value)
    {
        if (Multiple)
        {
            var current = Values ?? [];
            Values = current.Contains(value) ? current.Where(v => v != value).ToList() : [.. current, value];
            await ValuesChanged.InvokeAsync(Values);
        }
        else if (Value != value)
        {
            // Like mat-button-toggle-group, clicking the already-selected toggle keeps it selected.
            Value = value;
            await ValueChanged.InvokeAsync(Value);
        }
        RefreshToggles();
    }

    /// <summary>Arrow-key navigation in single-selection mode: move to, select, and focus the next enabled toggle.</summary>
    internal async Task MoveAsync(PBButtonToggle from, int step)
    {
        var enabled = toggles.Where(t => !t.IsDisabled).ToList();
        if (enabled.Count == 0) return;
        var index = enabled.IndexOf(from);
        var next = enabled[(index + step + enabled.Count) % enabled.Count];
        await ToggleAsync(next.Value);
        await next.FocusAsync();
    }

    protected override void OnParametersSet() => RefreshToggles();

    private void RefreshToggles()
    {
        foreach (var toggle in toggles)
        {
            toggle.Refresh();
        }
    }
}
