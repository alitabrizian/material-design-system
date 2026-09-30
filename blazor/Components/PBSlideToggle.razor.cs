namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// mat-slide-toggle. Attributes (<c>checked</c>, <c>disabled</c>, <c>@onchange</c>, …) go to the native
/// <c>&lt;input type="checkbox" role="switch"&gt;</c>, which covers the whole switch so any point on the
/// track toggles it.
/// </summary>
public partial class PBSlideToggle : WorkspaceComponentBase
{
    /// <summary>Hides the check/minus icons in the handle, like mat-slide-toggle's <c>hideIcon</c>.</summary>
    [Parameter] public bool HideIcon { get; set; }
}
