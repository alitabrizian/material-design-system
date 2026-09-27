using System.Globalization;

namespace Design.Components;

/// <summary>
/// mat-slider (single thumb). Attributes (<c>min</c>, <c>max</c>, <c>step</c>, <c>value</c>, <c>disabled</c>,
/// <c>@oninput</c>, …) go to a native <c>&lt;input type="range"&gt;</c>, which provides the keyboard model
/// (arrows, Home/End, PageUp/PageDown). The M3 track, active fill and handle are drawn by slider.css.
/// </summary>
public partial class PBSlider : WorkspaceComponentBase
{
    private string FillPercent
    {
        get
        {
            var min = Read("min", 0);
            var max = Read("max", 100);
            var value = Read("value", (min + max) / 2);
            var percent = max > min ? Math.Clamp((value - min) / (max - min) * 100, 0, 100) : 0;
            return percent.ToString("0.###", CultureInfo.InvariantCulture);
        }
    }

    private double Read(string name, double fallback) =>
        AdditionalAttributes is not null
        && AdditionalAttributes.TryGetValue(name, out var raw)
        && double.TryParse(Convert.ToString(raw, CultureInfo.InvariantCulture), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : fallback;
}
