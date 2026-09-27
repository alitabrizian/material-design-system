namespace Design.Components;

/// <summary>
/// matRipple: any content inside gets MatRipple ink from the pointer position (enter 450ms, fade
/// 400ms, pressed-state opacity). <see cref="Centered"/> always starts from the center;
/// <see cref="Unbounded"/> lets the ink extend past the container; <see cref="Color"/> takes a CSS
/// color expression built from tokens, e.g. <c>var(--md-sys-color-primary)</c>.
/// </summary>
public partial class PBRipples : WorkspaceComponentBase
{
    [Parameter] public bool Centered { get; set; }

    [Parameter] public bool Unbounded { get; set; }

    [Parameter] public bool Disabled { get; set; }

    [Parameter] public string? Color { get; set; }

    private string CssClass =>
        "pb-ripples pb-ripple-host"
        + (Centered ? " pb-ripple-centered" : "")
        + (Unbounded ? " pb-ripples--unbounded" : "")
        + (Disabled ? " pb-ripple-disabled" : "");
}
