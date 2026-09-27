namespace Design.Components;

/// <summary>
/// mat-form-field around your own native control (<c>&lt;input&gt;</c>, <c>&lt;textarea&gt;</c> or
/// <c>&lt;select&gt;</c>) passed as child content. Give the control an <c>id</c> and set
/// <see cref="LabelFor"/> to it so the label is associated. Controls without a <c>placeholder</c>
/// get <c>placeholder=" "</c> so the label can float once they have a value.
/// </summary>
public partial class PBFormField : WorkspaceFieldComponentBase
{
    /// <summary>The <c>id</c> of the projected control, for the label's <c>for</c> attribute.</summary>
    [Parameter] public string? LabelFor { get; set; }

    private ElementReference host;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            await DesignSystemJs.InvokeVoidAsync(JS, "ensurePlaceholders", host);
        }
    }
}
