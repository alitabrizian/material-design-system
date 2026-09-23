namespace Design.Demo.Services;

/// <summary>
/// Holds the demo app's current theme. Each theme is a fixed two-hue
/// (primary + tertiary) M3 palette locked to a single light or dark mode --
/// there is no independent light/dark toggle, matching Angular Material's
/// own prebuilt theme set. See tools/scripts/generate-palettes.mts for the
/// actual --md-sys-color-* token generation and
/// css/tokens.css for the resulting values per theme.
/// Registered as a singleton; the top app bar is the only component that
/// mutates it, but any component can subscribe to <see cref="Changed"/>.
/// </summary>
public sealed class ThemeState
{
    public const string DefaultTheme = "rose-red";

    public static readonly IReadOnlyList<ThemeOption> Themes =
    [
        new("rose-red", "Rose & Red", "#E3184F", "#B3261E", IsDark: false),
        new("azure-blue", "Azure & Blue", "#0091EA", "#0B57D0", IsDark: false),
        new("magenta-violet", "Magenta & Violet", "#D500F9", "#673AB7", IsDark: true),
        new("cyan-orange", "Cyan & Orange", "#00BCD4", "#F57C00", IsDark: true),
    ];

    public string Theme { get; private set; } = DefaultTheme;

    public event Action? Changed;

    /// <summary>Seeds Theme from an already-resolved value (e.g. read from the DOM/localStorage) without raising Changed.</summary>
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

    public sealed record ThemeOption(string Key, string Name, string PrimarySeed, string TertiarySeed, bool IsDark);
}
