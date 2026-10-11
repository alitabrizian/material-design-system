using System.Globalization;
using System.Text;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>Which values the calendar picks: days (Month), months (Year) or years (Decade).</summary>
public enum PBCalendarViewMode { Month, Year, Decade }

/// <summary>Calendar dropdown, scroll picker, or Auto (scroll picker in a dialog on touch phones, calendar elsewhere).</summary>
public enum PBDatePickerDisplayMode { Auto, Calendar, ScrollPicker }

public enum PBClearButtonDisplayMode { Never, Auto }

/// <summary>Regular: the caret stays in a mask section until the user moves it; Advancing: it moves on once the section is complete.</summary>
public enum PBMaskCaretMode { Regular, Advancing }

/// <summary>A day cell, passed to <c>DayCellTemplate</c>.</summary>
public sealed record PBCalendarDayContext(DateTime Date, string Text, bool IsSelected, bool IsToday, bool IsDisabled, bool IsWeekend, bool IsInRange);

/// <summary>Set <see cref="IsDisabled"/> to make a date unselectable.</summary>
public sealed class PBCustomDisabledDateEventArgs
{
    internal PBCustomDisabledDateEventArgs(DateTime date) => Date = date;

    public DateTime Date { get; }
    public bool IsDisabled { get; set; }
}

/// <summary>Culture helpers shared by the date editors.</summary>
internal static class DateCulture
{
    /// <summary>
    /// The culture with a Gregorian calendar: the editors work on DateTime's Gregorian dates, so cultures
    /// whose default calendar differs (fa-IR: Persian, th-TH: Thai…) use their Gregorian form for names and formats.
    /// </summary>
    public static CultureInfo Gregorian(CultureInfo culture)
    {
        if (culture.DateTimeFormat.Calendar is GregorianCalendar) return culture;
        var gregorian = culture.OptionalCalendars.OfType<GregorianCalendar>().FirstOrDefault();
        if (gregorian is null) return CultureInfo.InvariantCulture;
        var clone = (CultureInfo)culture.Clone();
        clone.DateTimeFormat.Calendar = gregorian;
        return clone;
    }
}

/// <summary>Converts the editors' value types (DateTime, DateOnly, DateTimeOffset and their nullable forms) to and from a date-time.</summary>
internal static class DateValue<TValue>
{
    private static readonly Type Underlying = Nullable.GetUnderlyingType(typeof(TValue)) ?? typeof(TValue);

    static DateValue()
    {
        if (Underlying != typeof(DateTime) && Underlying != typeof(DateOnly) && Underlying != typeof(DateTimeOffset))
            throw new InvalidOperationException($"Date editors support DateTime, DateOnly and DateTimeOffset values, not {typeof(TValue).Name}.");
    }

    public static bool IsOffset => Underlying == typeof(DateTimeOffset);
    public static bool IsDateOnly => Underlying == typeof(DateOnly);
    public static bool IsNullable => Nullable.GetUnderlyingType(typeof(TValue)) is not null;

    /// <summary>The value as a clock time, plus its offset for DateTimeOffset (null when empty).</summary>
    public static (DateTime Value, TimeSpan Offset)? Read(TValue? value) => value switch
    {
        null => null,
        DateTime d => (d, TimeSpan.Zero),
        DateOnly d => (d.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero),
        DateTimeOffset d => (d.DateTime, d.Offset),
        _ => null,
    };

    public static TValue? Write(DateTime? value, TimeSpan offset)
    {
        if (value is null) return default;
        // Box each branch: in a conditional, DateTime would silently convert to DateTimeOffset.
        object result = Underlying == typeof(DateOnly) ? (object)DateOnly.FromDateTime(value.Value)
            : Underlying == typeof(DateTimeOffset) ? (object)new DateTimeOffset(DateTime.SpecifyKind(value.Value, DateTimeKind.Unspecified), offset)
            : (object)value.Value;
        return (TValue)result;
    }
}

/// <summary>One part of a date format: a field the mask edits, or literal text.</summary>
internal sealed record DateFormatSection(string Kind, int Length, string? Text);

/// <summary>Splits .NET date format strings into sections (for masks and the scroll picker) and formats/parses with them.</summary>
internal static class DateFormat
{
    /// <summary>Expands a standard format ("d", "g", "D"…) to its culture pattern.</summary>
    public static string Expand(string format, CultureInfo culture)
    {
        var info = culture.DateTimeFormat;
        if (format.Length != 1) return format;
        return format[0] switch
        {
            'd' => info.ShortDatePattern,
            'D' => info.LongDatePattern,
            'f' => info.LongDatePattern + " " + info.ShortTimePattern,
            'F' => info.FullDateTimePattern,
            'g' => info.ShortDatePattern + " " + info.ShortTimePattern,
            'G' => info.ShortDatePattern + " " + info.LongTimePattern,
            'M' or 'm' => info.MonthDayPattern,
            'Y' or 'y' => info.YearMonthPattern,
            't' => info.ShortTimePattern,
            'T' => info.LongTimePattern,
            's' => info.SortableDateTimePattern,
            'u' => info.UniversalSortableDateTimePattern,
            _ => format,
        };
    }

    public static List<DateFormatSection> Sections(string format, CultureInfo culture)
    {
        var pattern = Expand(format, culture);
        var sections = new List<DateFormatSection>();
        var literal = new StringBuilder();
        void Flush()
        {
            if (literal.Length == 0) return;
            sections.Add(new DateFormatSection("literal", literal.Length, literal.ToString()));
            literal.Clear();
        }
        for (var i = 0; i < pattern.Length; i++)
        {
            var c = pattern[i];
            if (c is '\'' or '"')
            {
                var end = pattern.IndexOf(c, i + 1);
                if (end < 0) end = pattern.Length;
                literal.Append(pattern, i + 1, Math.Max(0, end - i - 1));
                i = end;
                continue;
            }
            if (c == '\\' && i + 1 < pattern.Length)
            {
                literal.Append(pattern[++i]);
                continue;
            }
            if (c == '/')
            {
                literal.Append(culture.DateTimeFormat.DateSeparator);
                continue;
            }
            if (c == ':')
            {
                literal.Append(culture.DateTimeFormat.TimeSeparator);
                continue;
            }
            if ("dMyHhmsftz".Contains(c))
            {
                var length = 1;
                while (i + length < pattern.Length && pattern[i + length] == c) length++;
                Flush();
                var kind = c switch
                {
                    'd' => length >= 3 ? "weekday" : "day",
                    'M' => length >= 3 ? "monthName" : "month",
                    'y' => "year",
                    'H' => "hour24",
                    'h' => "hour12",
                    'm' => "minute",
                    's' => "second",
                    'f' => "fraction",
                    't' => "ampm",
                    _ => "offset",
                };
                sections.Add(new DateFormatSection(kind, length, null));
                i += length - 1;
                continue;
            }
            literal.Append(c);
        }
        Flush();
        return sections;
    }

    public static bool HasTime(string format, CultureInfo culture) =>
        Sections(format, culture).Any(s => s.Kind is "hour24" or "hour12" or "minute" or "second");

    /// <summary>Formats a value; DateTimeOffset patterns ("zzz") use <paramref name="offset"/>.</summary>
    public static string Format(DateTime value, TimeSpan offset, string format, CultureInfo culture, bool withOffset) =>
        withOffset ? new DateTimeOffset(DateTime.SpecifyKind(value, DateTimeKind.Unspecified), offset).ToString(format, culture) : value.ToString(format, culture);

    /// <summary>Parses user input: the edit format first, then anything the culture understands.</summary>
    public static bool TryParse(string text, string? format, CultureInfo culture, bool withOffset, out DateTime value, out TimeSpan? offset)
    {
        offset = null;
        text = text.Trim();
        if (withOffset)
        {
            if ((format is not null && DateTimeOffset.TryParseExact(text, Expand(format, culture), culture, DateTimeStyles.AllowWhiteSpaces, out var exact))
                || DateTimeOffset.TryParse(text, culture, DateTimeStyles.AllowWhiteSpaces | DateTimeStyles.AssumeLocal, out exact))
            {
                value = exact.DateTime;
                offset = exact.Offset;
                return true;
            }
            value = default;
            return false;
        }
        if (format is not null && DateTime.TryParseExact(text, Expand(format, culture), culture, DateTimeStyles.AllowWhiteSpaces, out value)) return true;
        return DateTime.TryParse(text, culture, DateTimeStyles.AllowWhiteSpaces, out value);
    }
}
