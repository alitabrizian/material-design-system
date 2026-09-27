namespace Design.Demo.Services;

/// <summary>
/// The demo's current theme: one of the design system's four Material Design 3 themes, each a
/// fixed palette locked to light or dark (there is no separate light/dark toggle). The colors
/// themselves live only in the generated tokens.css (libs/design-system/tokens); nothing here
/// holds a color value. Scoped per circuit; the top app bar is the only writer.
/// </summary>
public sealed class ThemeState
{
    public const string DefaultTheme = "rose-red";

    public static readonly IReadOnlyList<ThemeOption> Themes =
    [
        new("rose-red", "Rose & Red", IsDark: false),
        new("azure-blue", "Azure & Blue", IsDark: false),
        new("magenta-violet", "Magenta & Violet", IsDark: true),
        new("cyan-orange", "Cyan & Orange", IsDark: true),
    ];

    public string Theme { get; private set; } = DefaultTheme;

    public event Action? Changed;

    /// <summary>Seeds Theme from an already-resolved value (read from the DOM) without raising Changed.</summary>
    public void Initialize(string? theme)
    {
        Theme = Themes.Any(t => t.Key == theme) ? theme! : DefaultTheme;
    }

    public void SetTheme(string theme)
    {
        if (theme == Theme || !Themes.Any(t => t.Key == theme))
            return;

        Theme = theme;
        Changed?.Invoke();
    }

    public sealed record ThemeOption(string Key, string Name, bool IsDark);
}
