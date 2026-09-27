using Microsoft.AspNetCore.Components;

namespace Design.Components;

public abstract class WorkspaceComponentBase : ComponentBase
{
    [Parameter] public RenderFragment? ChildContent { get; set; }
    [Parameter] public string? Label { get; set; }
    [Parameter(CaptureUnmatchedValues = true)] public IReadOnlyDictionary<string, object>? AdditionalAttributes { get; set; }

    /// <summary>
    /// The consumer's <c>class</c> attribute. Components append it to their own classes instead of
    /// letting attribute splatting replace them (a splatted <c>class</c> overwrites the element's).
    /// </summary>
    protected string? UserClass =>
        AdditionalAttributes?.TryGetValue("class", out var value) == true ? Convert.ToString(value) : null;

    /// <summary><see cref="AdditionalAttributes"/> without <c>class</c> (merged via <see cref="UserClass"/>).</summary>
    protected IReadOnlyDictionary<string, object>? Attrs =>
        AdditionalAttributes is null || !AdditionalAttributes.ContainsKey("class")
            ? AdditionalAttributes
            : AdditionalAttributes.Where(a => a.Key != "class").ToDictionary(a => a.Key, a => a.Value);
}
