using Microsoft.AspNetCore.Components.Web;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary><c>Standard</c> = mat-sidenav mode="side"; <c>Over</c> = mode="over" (floats above content with a scrim).</summary>
public enum PBSidenavMode { Standard, Over }

public enum PBSidenavPosition { Start, End }

/// <summary>
/// mat-sidenav. In <see cref="PBSidenavMode.Over"/> mode it is a fixed drawer that slides in over the page
/// with a scrim; clicking the scrim or pressing Escape closes it.
/// </summary>
public partial class PBSidenav : WorkspaceComponentBase
{
    [Parameter] public PBSidenavMode Mode { get; set; } = PBSidenavMode.Standard;
    [Parameter] public PBSidenavPosition Position { get; set; } = PBSidenavPosition.Start;
    [Parameter] public bool Opened { get; set; } = true;
    [Parameter] public EventCallback<bool> OpenedChanged { get; set; }

    private string CssClass =>
        "pb-sidenav"
        + (Mode == PBSidenavMode.Over ? " pb-sidenav--over" : " pb-sidenav--side")
        + (Position == PBSidenavPosition.End ? " pb-sidenav--end" : "")
        + (Opened ? " pb-sidenav--opened" : "");

    private async Task CloseAsync()
    {
        Opened = false;
        await OpenedChanged.InvokeAsync(false);
    }

    private Task OnKeyDownAsync(KeyboardEventArgs e) =>
        e.Key == "Escape" && Mode == PBSidenavMode.Over && Opened ? CloseAsync() : Task.CompletedTask;
}
