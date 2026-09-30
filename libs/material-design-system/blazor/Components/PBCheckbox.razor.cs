namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// mat-checkbox. Attributes (<c>checked</c>, <c>disabled</c>, <c>name</c>, <c>@onchange</c>, …) are
/// passed to the native <c>&lt;input type="checkbox"&gt;</c>, which keeps real form and keyboard
/// behavior; the visual box, checkmark and state layer are drawn by <c>checkbox.css</c>.
/// </summary>
public partial class PBCheckbox : WorkspaceComponentBase
{
    /// <summary>Shows the mixed state (a dash) and reports <c>aria-checked="mixed"</c>, like mat-checkbox's <c>indeterminate</c>.</summary>
    [Parameter] public bool Indeterminate { get; set; }

    private ElementReference input;
    private bool? appliedIndeterminate;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (appliedIndeterminate != Indeterminate && (Indeterminate || appliedIndeterminate is not null))
        {
            appliedIndeterminate = Indeterminate;
            await DesignSystemJs.InvokeVoidAsync(JS, "setIndeterminate", input, Indeterminate);
        }
    }
}
