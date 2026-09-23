namespace Design.Components;

public abstract class WorkspaceFieldComponentBase : WorkspaceComponentBase
{
    [Parameter] public string? SupportingText { get; set; }
    [Parameter] public string? ErrorText { get; set; }
    private bool HasError => !string.IsNullOrEmpty(ErrorText);
    protected string? FieldHintText => HasError ? ErrorText : SupportingText;
    protected string FieldHintClass => HasError ? "workspace-field-hint workspace-field-hint--error" : "workspace-field-hint";
}
