namespace Design.Components;

public enum PBSidenavMode { Standard, Over }

public partial class PBSidenav : WorkspaceComponentBase
{
    [Parameter] public PBSidenavMode Mode { get; set; } = PBSidenavMode.Standard;
    [Parameter] public bool Opened { get; set; } = true;
    [Parameter] public EventCallback<bool> OpenedChanged { get; set; }

    private Task CloseAsync() => OpenedChanged.InvokeAsync(false);
}
