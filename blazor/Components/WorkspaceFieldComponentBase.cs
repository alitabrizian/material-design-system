namespace Design.Components;

/// <summary>mat-form-field appearances.</summary>
public enum PBFormFieldAppearance { Fill, Outline }

/// <summary>
/// Shared parameters of every component rendered inside the M3 form-field shell
/// (<see cref="FormFieldFrame"/>): label, supporting/error text, appearance and icon slots.
/// </summary>
public abstract class WorkspaceFieldComponentBase : WorkspaceComponentBase
{
    [Parameter] public string? SupportingText { get; set; }
    [Parameter] public string? ErrorText { get; set; }

    /// <summary><c>Fill</c> (default, like mat-form-field) or <c>Outline</c>.</summary>
    [Parameter] public PBFormFieldAppearance Appearance { get; set; } = PBFormFieldAppearance.Fill;

    /// <summary>Leading icon (matIconPrefix), e.g. <c>&lt;span class="material-icons"&gt;search&lt;/span&gt;</c>.</summary>
    [Parameter] public RenderFragment? Prefix { get; set; }

    /// <summary>Trailing icon or icon button (matIconSuffix).</summary>
    [Parameter] public RenderFragment? Suffix { get; set; }

    /// <summary>Stretches the field to its container's width (Angular examples do this with a CSS class).</summary>
    [Parameter] public bool Block { get; set; }

    protected bool HasError => !string.IsNullOrEmpty(ErrorText);
    protected string? FieldHintText => HasError ? ErrorText : SupportingText;

    /// <summary>Stable id linking the label (and hint) to the control.</summary>
    protected string FieldId { get; } = "pb-field-" + Guid.NewGuid().ToString("N")[..8];

    /// <summary>The id to put on the control: the consumer's <c>id</c> attribute if given, else <see cref="FieldId"/>.</summary>
    protected string ControlId =>
        AdditionalAttributes?.TryGetValue("id", out var id) == true && id?.ToString() is { Length: > 0 } s ? s : FieldId;

    protected bool IsDisabledAttribute =>
        AdditionalAttributes?.TryGetValue("disabled", out var value) == true
        && value is not false && !"false".Equals(value?.ToString(), StringComparison.OrdinalIgnoreCase);

    protected bool IsRequiredAttribute =>
        AdditionalAttributes?.TryGetValue("required", out var value) == true
        && value is not false && !"false".Equals(value?.ToString(), StringComparison.OrdinalIgnoreCase);
}
