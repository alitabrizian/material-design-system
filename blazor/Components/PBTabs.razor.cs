using Microsoft.AspNetCore.Components.Web;

namespace Design.Components;

public enum PBTabsAlign { Start, Center, End }

/// <summary>
/// mat-tab-group. Declare <see cref="PBTab"/>s as child content; the group renders the tab header
/// (tablist) and the selected tab's content (tabpanel). Arrow keys, Home and End move focus between
/// tabs; Enter/Space (or click) selects, like mat-tab-group.
/// </summary>
public partial class PBTabs : WorkspaceComponentBase
{
    [Parameter] public int SelectedIndex { get; set; }
    [Parameter] public EventCallback<int> SelectedIndexChanged { get; set; }

    /// <summary>Tabs share the header width equally (mat-stretch-tabs, on by default in Angular Material).</summary>
    [Parameter] public bool Stretch { get; set; } = true;

    /// <summary>Alignment of non-stretched tabs (mat-align-tabs).</summary>
    [Parameter] public PBTabsAlign Align { get; set; } = PBTabsAlign.Start;

    private readonly List<PBTab> tabs = [];
    private readonly string id = Guid.NewGuid().ToString("N")[..8];
    private ElementReference tablist;
    private int? animateFrom;

    private string CssClass =>
        "pb-tabs"
        + (Stretch ? " pb-tabs--stretch" : "")
        + Align switch { PBTabsAlign.Center => " pb-tabs--align-center", PBTabsAlign.End => " pb-tabs--align-end", _ => "" };

    private string TabId(int index) => $"pb-tab-{id}-{index}";
    private string PanelId(int index) => $"pb-tab-panel-{id}-{index}";

    internal void Register(PBTab tab)
    {
        tabs.Add(tab);
        StateHasChanged();
    }

    internal void Unregister(PBTab tab)
    {
        tabs.Remove(tab);
        StateHasChanged();
    }

    internal void Refresh() => InvokeAsync(StateHasChanged);

    private async Task SelectAsync(int index)
    {
        if (index == SelectedIndex || index < 0 || index >= tabs.Count || tabs[index].Disabled) return;
        animateFrom = SelectedIndex;
        SelectedIndex = index;
        await SelectedIndexChanged.InvokeAsync(index);
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (animateFrom is { } from)
        {
            animateFrom = null;
            await DesignSystemJs.InvokeVoidAsync(JS, "animateTabIndicator", tablist, from, SelectedIndex);
        }
    }

    private async Task OnKeyDownAsync(KeyboardEventArgs e)
    {
        if (e.Key is "ArrowLeft" or "ArrowRight" or "Home" or "End")
        {
            await DesignSystemJs.InvokeVoidAsync(JS, "moveFocus", tablist, "[role='tab']", e.Key);
        }
    }
}
