using Microsoft.AspNetCore.Components.Web;
using Microsoft.JSInterop;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// mat-select: an M3 form field whose trigger opens a listbox panel of <see cref="PBOption{TValue}"/>s.
/// Bind the selection with <c>@bind-Value</c>. Keyboard model follows mat-select: arrows change the
/// selection while closed, Enter/Space/Alt+ArrowDown open, arrows/Home/End move the active option
/// while open, Enter/Space select, Escape/Tab close, typing jumps to a matching option.
/// </summary>
public partial class PBSelect<TValue> : WorkspaceFieldComponentBase
{
    private static readonly string[] HandledKeys = ["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "PageUp", "PageDown"];

    [Parameter] public TValue? Value { get; set; }
    [Parameter] public EventCallback<TValue?> ValueChanged { get; set; }

    /// <summary>Shown in the trigger when nothing is selected (once the label has floated).</summary>
    [Parameter] public string? Placeholder { get; set; }

    [Parameter] public bool Disabled { get; set; }

    [Parameter] public bool Required { get; set; }

    /// <summary>Hides the checkmark on the selected option (mat-select's <c>hideSingleSelectionIndicator</c>).</summary>
    [Parameter] public bool HideSingleSelectionIndicator { get; set; }

    private readonly List<PBOption<TValue>> options = [];
    private ElementReference trigger;
    private ElementReference panel;
    private DotNetObjectReference<PBSelect<TValue>>? selfReference;
    private bool open;
    private int activeIndex = -1;
    private string typeahead = string.Empty;
    private DateTime lastTypeahead;
    private bool pendingOpen;
    private bool pendingScroll;

    private string PanelId => ControlId + "-panel";

    private bool IsFloating => open || SelectedOption is not null || (Placeholder is not null && open);

    internal PBOption<TValue>? SelectedOption => options.FirstOrDefault(o => IsSelected(o.Value));

    private PBOption<TValue>? ActiveOption => activeIndex >= 0 && activeIndex < options.Count ? options[activeIndex] : null;

    internal bool IsSelected(TValue? value) => EqualityComparer<TValue?>.Default.Equals(value, Value);

    internal bool IsActive(PBOption<TValue> option) => open && ActiveOption == option;

    internal bool ShowCheckmark => !HideSingleSelectionIndicator;

    internal void Register(PBOption<TValue> option)
    {
        options.Add(option);
        StateHasChanged();
    }

    internal void Unregister(PBOption<TValue> option) => options.Remove(option);

    /// <summary>Options only re-render on their own parameter changes, so selection/active changes are pushed to them.</summary>
    private void RefreshOptions()
    {
        foreach (var option in options) option.Refresh();
    }

    protected override void OnParametersSet() => RefreshOptions();

    internal async Task SelectAsync(PBOption<TValue> option)
    {
        if (option.Disabled) return;
        await SetValueAsync(option.Value);
        await CloseAsync();
        await DesignSystemJs.InvokeVoidAsync(JS, "focus", trigger);
    }

    private async Task SetValueAsync(TValue? value)
    {
        if (IsSelected(value)) return;
        Value = value;
        RefreshOptions();
        await ValueChanged.InvokeAsync(value);
    }

    private Task ToggleAsync() => open ? CloseAsync() : OpenAsync();

    private Task OpenAsync()
    {
        if (Disabled || open || options.Count == 0) return Task.CompletedTask;
        open = true;
        var selected = SelectedOption;
        activeIndex = selected is not null ? options.IndexOf(selected) : NextEnabled(-1, 1);
        pendingOpen = true;
        RefreshOptions();
        StateHasChanged();
        return Task.CompletedTask;
    }

    private async Task CloseAsync()
    {
        if (!open) return;
        open = false;
        activeIndex = -1;
        await DesignSystemJs.InvokeVoidAsync(JS, "unposition", panel);
        RefreshOptions();
        StateHasChanged();
    }

    [JSInvokable]
    public Task CloseFromOutside() => InvokeAsync(CloseAsync);

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            await DesignSystemJs.InvokeVoidAsync(JS, "preventKeys", trigger, HandledKeys);
        }
        if (pendingOpen)
        {
            pendingOpen = false;
            pendingScroll = true;
            selfReference ??= DotNetObjectReference.Create(this);
            await DesignSystemJs.InvokeVoidAsync(JS, "position", panel, trigger, new
            {
                x = "start",
                matchWidth = true,
                anchorClosest = ".pb-form-field",
                anchorSelector = ".pb-form-field__wrapper",
                dotNet = selfReference,
                closeMethod = nameof(CloseFromOutside),
            });
        }
        if (pendingScroll && open)
        {
            pendingScroll = false;
            await DesignSystemJs.InvokeVoidAsync(JS, "scrollIntoView", panel, ".pb-option--active");
        }
    }

    private async Task OnKeyDownAsync(KeyboardEventArgs e)
    {
        if (Disabled) return;

        if (!open)
        {
            switch (e.Key)
            {
                case "Enter" or " ":
                case "ArrowDown" or "ArrowUp" when e.AltKey:
                    await OpenAsync();
                    return;
                case "ArrowDown":
                    await MoveSelectionAsync(1);
                    return;
                case "ArrowUp":
                    await MoveSelectionAsync(-1);
                    return;
            }
            if (IsTypeaheadKey(e)) await TypeaheadAsync(e.Key, selectImmediately: true);
            return;
        }

        switch (e.Key)
        {
            case "ArrowDown" when e.AltKey:
            case "ArrowUp" when e.AltKey:
            case "Escape":
            case "Tab":
                await CloseAsync();
                break;
            case "ArrowDown":
                SetActive(NextEnabled(activeIndex, 1));
                break;
            case "ArrowUp":
                SetActive(NextEnabled(activeIndex, -1));
                break;
            case "Home" or "PageUp":
                SetActive(NextEnabled(-1, 1));
                break;
            case "End" or "PageDown":
                SetActive(NextEnabled(options.Count, -1));
                break;
            case "Enter" or " ":
                if (ActiveOption is not null) await SelectAsync(ActiveOption);
                break;
            default:
                if (IsTypeaheadKey(e)) await TypeaheadAsync(e.Key, selectImmediately: false);
                break;
        }
    }

    private async Task MoveSelectionAsync(int step)
    {
        var current = SelectedOption is { } s ? options.IndexOf(s) : -1;
        var next = NextEnabled(current, step);
        if (next >= 0) await SetValueAsync(options[next].Value);
    }

    private void SetActive(int index)
    {
        if (index < 0) return;
        activeIndex = index;
        pendingScroll = true;
        RefreshOptions();
    }

    private int NextEnabled(int from, int step)
    {
        for (var i = from + step; i >= 0 && i < options.Count; i += step)
        {
            if (!options[i].Disabled) return i;
        }
        return from >= 0 && from < options.Count ? from : -1;
    }

    private static bool IsTypeaheadKey(KeyboardEventArgs e) =>
        e.Key.Length == 1 && e.Key != " " && !e.CtrlKey && !e.MetaKey && !e.AltKey;

    private async Task TypeaheadAsync(string key, bool selectImmediately)
    {
        var now = DateTime.UtcNow;
        typeahead = (now - lastTypeahead).TotalMilliseconds > 200 ? key : typeahead + key;
        lastTypeahead = now;

        var start = Math.Max(activeIndex, 0);
        for (var n = 0; n < options.Count; n++)
        {
            var i = (start + (typeahead.Length == 1 ? n + 1 : n)) % options.Count;
            var option = options[i];
            if (!option.Disabled && option.TypeaheadText.StartsWith(typeahead, StringComparison.CurrentCultureIgnoreCase))
            {
                if (selectImmediately) await SetValueAsync(option.Value);
                else SetActive(i);
                return;
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (open) await DesignSystemJs.InvokeVoidAsync(JS, "unposition", panel);
        selfReference?.Dispose();
    }
}
