namespace Design.Demo.Services;

/// <summary>
/// Holds the demo app's current color mode and palette (see
/// css/material-tokens.css for the actual --md-sys-color-* token values per
/// palette/mode). Registered as a singleton; the top app bar is the only
/// component that mutates it, but any component can subscribe to
/// <see cref="Changed"/>.
/// </summary>
public sealed class ThemeState
{
    public const string LightMode = "light";
    public const string DarkMode = "dark";
    public const string DefaultPalette = "purple";

    public static readonly IReadOnlyList<PaletteOption> Palettes =
    [
        new("purple", "Purple", "#6750A4"),
        new("blue", "Blue", "#0B57D0"),
        new("green", "Green", "#006E1C"),
        new("orange", "Orange", "#8B5000"),
        new("red", "Red", "#B3261E"),
        new("teal", "Teal", "#006A6A"),
    ];

    public string Mode { get; private set; } = LightMode;

    public string Palette { get; private set; } = DefaultPalette;

    public event Action? Changed;

    /// <summary>Seeds Mode/Palette from already-resolved values (e.g. read from the DOM/localStorage) without raising Changed.</summary>
    public void Initialize(string? mode, string? palette)
    {
        Mode = mode == DarkMode ? DarkMode : LightMode;
        Palette = Palettes.Any(p => p.Key == palette) ? palette! : DefaultPalette;
    }

    public void ToggleMode() => SetMode(Mode == DarkMode ? LightMode : DarkMode);

    public void SetMode(string mode)
    {
        if (mode != LightMode && mode != DarkMode || mode == Mode)
            return;

        Mode = mode;
        Changed?.Invoke();
    }

    public void SetPalette(string palette)
    {
        if (palette == Palette || !Palettes.Any(p => p.Key == palette))
            return;

        Palette = palette;
        Changed?.Invoke();
    }

    public sealed record PaletteOption(string Key, string Name, string Seed);
}
