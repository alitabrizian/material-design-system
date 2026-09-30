namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// mat-option inside a <see cref="PBSelect{TValue}"/>. The option text is <see cref="WorkspaceComponentBase.ChildContent"/>
/// (or <see cref="WorkspaceComponentBase.Label"/>); the same content is shown in the select's trigger when selected.
/// </summary>
public partial class PBOption<TValue> : WorkspaceComponentBase
{
    [CascadingParameter] private PBSelect<TValue>? Select { get; set; }

    [Parameter, EditorRequired] public TValue Value { get; set; } = default!;

    [Parameter] public bool Disabled { get; set; }

    internal string Id { get; } = "pb-option-" + Guid.NewGuid().ToString("N")[..8];

    internal RenderFragment Display => ChildContent ?? (builder => builder.AddContent(0, Label ?? Value?.ToString()));

    internal string TypeaheadText => Label ?? Value?.ToString() ?? string.Empty;

    private bool Selected => Select?.IsSelected(Value) == true;

    private bool Active => Select?.IsActive(this) == true;

    protected override void OnInitialized() => Select?.Register(this);

    internal void Refresh() => InvokeAsync(StateHasChanged);

    private Task OnClickAsync() => Select?.SelectAsync(this) ?? Task.CompletedTask;

    public void Dispose() => Select?.Unregister(this);
}
