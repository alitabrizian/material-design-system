using System.Globalization;
using Microsoft.JSInterop;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// mat-calendar: a month view (days), a year view (months) and a multi-year view (24 years) with the
/// period button and previous/next arrows, M3 colors (primary selection, primary today ring,
/// primary-container range band) and full keyboard navigation. Picks a date, or a range with
/// <see cref="RangeSelection"/>; <see cref="ViewMode"/> limits picking to months or years.
/// </summary>
public partial class PBCalendar : WorkspaceComponentBase
{
    private enum View { Month, Year, MultiYear }

    private const int YearsPerPage = 24;
    private const int YearsPerRow = 4;

    [Inject] private IJSRuntime JS { get; set; } = default!;

    [Parameter] public DateTime? SelectedDate { get; set; }
    [Parameter] public EventCallback<DateTime?> SelectedDateChanged { get; set; }

    /// <summary>Picks a start and an end date instead of one date.</summary>
    [Parameter] public bool RangeSelection { get; set; }
    [Parameter] public DateTime? StartDate { get; set; }
    [Parameter] public EventCallback<DateTime?> StartDateChanged { get; set; }
    [Parameter] public DateTime? EndDate { get; set; }
    [Parameter] public EventCallback<DateTime?> EndDateChanged { get; set; }

    [Parameter] public DateTime? MinDate { get; set; }
    [Parameter] public DateTime? MaxDate { get; set; }

    /// <summary>Disables dates by custom logic (weekends, holidays…).</summary>
    [Parameter] public Action<PBCustomDisabledDateEventArgs>? CustomDisabledDate { get; set; }

    /// <summary>Month picks days; Year picks months; Decade picks years.</summary>
    [Parameter] public PBCalendarViewMode ViewMode { get; set; }

    [Parameter] public DayOfWeek? FirstDayOfWeek { get; set; }
    [Parameter] public CultureInfo? Culture { get; set; }

    /// <summary>Persian shows Persian (Jalali, Shamsi) months, days and years (with the culture's Persian calendar, or fa-IR's).</summary>
    [Parameter] public PBCalendarSystem CalendarSystem { get; set; }

    /// <summary>Custom day cell content (e.g. to highlight special dates).</summary>
    [Parameter] public RenderFragment<PBCalendarDayContext>? DayCellTemplate { get; set; }

    /// <summary>The month (year, decade) shown first; defaults to the selection or today.</summary>
    [Parameter] public DateTime? VisibleDate { get; set; }

    /// <summary>A second range drawn for comparison (e.g. the previous period).</summary>
    [Parameter] public DateTime? ComparisonStart { get; set; }
    [Parameter] public DateTime? ComparisonEnd { get; set; }

    /// <summary>Range selection strategy: maps a clicked (or hovered) date to the whole range, e.g. a 5-day week.</summary>
    [Parameter] public Func<DateTime, (DateTime Start, DateTime End)>? RangeSelectionStrategy { get; set; }

    /// <summary>Replaces the header (period button and arrows); the context navigates the calendar.</summary>
    [Parameter] public RenderFragment<PBCalendarHeaderContext>? HeaderTemplate { get; set; }

    /// <summary>The view the calendar opens in (defaults to <see cref="ViewMode"/>'s).</summary>
    [Parameter] public PBCalendarViewMode? StartView { get; set; }

    /// <summary>Raised when the user picks a value at the <see cref="ViewMode"/> level (a range: when it is complete).</summary>
    [Parameter] public EventCallback<DateTime> DatePicked { get; set; }

    private View view;
    private DateTime active;
    private DateTime? hover;
    private bool initialized;
    private bool focusAfterRender;
    private ElementReference content;
    private readonly string id = "pb-calendar-" + Guid.NewGuid().ToString("N")[..8];

    private CultureInfo CurrentCulture => DateCulture.For(Culture ?? CultureInfo.CurrentCulture, CalendarSystem);
    private DateTimeFormatInfo Info => CurrentCulture.DateTimeFormat;

    // Year, month and day in the culture's calendar (Gregorian or Persian).
    private System.Globalization.Calendar Cal => Info.Calendar;
    private int Y(DateTime date) => Cal.GetYear(date);
    private int M(DateTime date) => Cal.GetMonth(date);
    private int D(DateTime date) => Cal.GetDayOfMonth(date);
    private int DaysIn(int year, int month) => Cal.GetDaysInMonth(year, month);
    private DateTime Make(int year, int month, int day) => Cal.ToDateTime(year, month, day, 0, 0, 0, 0);
    private DayOfWeek FirstDay => FirstDayOfWeek ?? Info.FirstDayOfWeek;
    private static DateTime Today => DateTime.Today;

    private View MinView => ViewMode switch
    {
        PBCalendarViewMode.Year => View.Year,
        PBCalendarViewMode.Decade => View.MultiYear,
        _ => View.Month,
    };

    protected override void OnParametersSet()
    {
        if (initialized) return;
        initialized = true;
        view = StartView switch
        {
            PBCalendarViewMode.Decade => View.MultiYear,
            PBCalendarViewMode.Year when MinView != View.MultiYear => View.Year,
            _ => MinView,
        };
        active = Clamp((VisibleDate ?? (RangeSelection ? StartDate : SelectedDate) ?? Today).Date);
    }

    /// <summary>Shows the month (year, decade) containing <paramref name="date"/>.</summary>
    public void ShowDate(DateTime date)
    {
        active = Clamp(date.Date);
        view = MinView;
        StateHasChanged();
    }

    /// <summary>Moves keyboard focus to the active cell.</summary>
    public async Task FocusAsync()
    {
        focusAfterRender = false;
        await DesignSystemJs.InvokeVoidAsync(JS, "focusFirst", content, ".pb-calendar__cell-button[tabindex='0']");
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (focusAfterRender) await FocusAsync();
    }

    private DateTime Clamp(DateTime date)
    {
        if (MinDate is { } min && date < min.Date) return min.Date;
        if (MaxDate is { } max && date > max.Date) return max.Date;
        return date;
    }

    // ------------------------------------------------------------------ disabled and selected

    public bool IsDateDisabled(DateTime date)
    {
        date = date.Date;
        if (MinDate is { } min && date < min.Date) return true;
        if (MaxDate is { } max && date > max.Date) return true;
        if (CustomDisabledDate is null) return false;
        var args = new PBCustomDisabledDateEventArgs(date);
        CustomDisabledDate(args);
        return args.IsDisabled;
    }

    private bool IsMonthDisabled(int year, int month)
    {
        var first = Make(year, month, 1);
        var last = Make(year, month, DaysIn(year, month));
        if (MinDate is { } min && last < min.Date) return true;
        if (MaxDate is { } max && first > max.Date) return true;
        if (ViewMode == PBCalendarViewMode.Year && CustomDisabledDate is not null) return IsDateDisabled(first);
        return false;
    }

    private bool IsYearDisabled(int year)
    {
        if (MinDate is { } min && year < Y(min)) return true;
        if (MaxDate is { } max && year > Y(max)) return true;
        if (ViewMode == PBCalendarViewMode.Decade && CustomDisabledDate is not null) return IsDateDisabled(Make(year, 1, 1));
        return false;
    }

    private bool IsSelectedDay(DateTime date) =>
        RangeSelection ? (StartDate?.Date == date || EndDate?.Date == date) : SelectedDate?.Date == date;

    private bool IsSelectedMonth(int year, int month)
    {
        var value = RangeSelection ? StartDate : SelectedDate;
        return value is { } v && Y(v) == year && M(v) == month;
    }

    private bool IsSelectedYear(int year)
    {
        var value = RangeSelection ? StartDate : SelectedDate;
        return value is { } v && Y(v) == year;
    }

    /// <summary>The range to draw: the committed one, or start..hovered date while picking the end.</summary>
    private (DateTime Start, DateTime End)? DisplayRange
    {
        get
        {
            if (RangeSelection && RangeSelectionStrategy is not null && hover is { } hovered && !IsDateDisabled(hovered))
            {
                var preview = RangeSelectionStrategy(hovered);
                return (preview.Start.Date, preview.End.Date);
            }
            if (!RangeSelection || StartDate is not { } start) return null;
            if (EndDate is { } end) return (start.Date, end.Date);
            if (hover is { } h && h >= start.Date) return (start.Date, h);
            return null;
        }
    }

    private bool IsPreview => RangeSelection && ((StartDate is not null && EndDate is null) || (RangeSelectionStrategy is not null && hover is not null));

    private bool InComparison(DateTime date) =>
        ComparisonStart is { } start && ComparisonEnd is { } end && date >= start.Date && date <= end.Date;

    /// <summary>The header template's context.</summary>
    private PBCalendarHeaderContext HeaderContext => new(
        PeriodLabel,
        active,
        view switch { View.Month => PBCalendarViewMode.Month, View.Year => PBCalendarViewMode.Year, _ => PBCalendarViewMode.Decade },
        CanPrevious,
        CanNext,
        () => Navigate(Previous),
        () => Navigate(Next),
        () => Navigate(() => active = Clamp(Cal.AddYears(active, -1))),
        () => Navigate(() => active = Clamp(Cal.AddYears(active, 1))),
        () => Navigate(TogglePeriod));

    private void Navigate(Action action)
    {
        action();
        StateHasChanged();
    }

    // ------------------------------------------------------------------ labels

    private string PeriodLabel => view switch
    {
        View.Month => active.ToString("MMM yyyy", CurrentCulture).ToUpper(CurrentCulture),
        View.Year => Y(active).ToString(CurrentCulture),
        _ => $"{YearPageStart} – {YearPageStart + YearsPerPage - 1}",
    };

    private string PeriodButtonLabel => view == View.Month ? "Choose month and year" : "Choose date";

    private string PreviousLabel => view switch { View.Month => "Previous month", View.Year => "Previous year", _ => "Previous 24 years" };
    private string NextLabel => view switch { View.Month => "Next month", View.Year => "Next year", _ => "Next 24 years" };

    private int YearPageStart
    {
        get
        {
            // mat-multi-year-view: pages of 24 years counted from the max date's (or min date's, or year 0's) page.
            var startingYear = MaxDate is { } max ? Y(max) - YearsPerPage + 1 : MinDate is { } min ? Y(min) : 0;
            var offset = (((Y(active) - startingYear) % YearsPerPage) + YearsPerPage) % YearsPerPage;
            return Y(active) - offset;
        }
    }

    private string MonthLabel(int month) => Info.GetAbbreviatedMonthName(month).ToUpper(CurrentCulture).TrimEnd('.');

    private List<(DayOfWeek Day, string Narrow, string Long)> WeekDays()
    {
        var days = new List<(DayOfWeek, string, string)>();
        for (var i = 0; i < 7; i++)
        {
            var day = (DayOfWeek)(((int)FirstDay + i) % 7);
            var narrow = Info.GetShortestDayName(day);
            days.Add((day, narrow.Length > 0 ? narrow[..1].ToUpper(CurrentCulture) : narrow, Info.GetDayName(day)));
        }
        return days;
    }

    // ------------------------------------------------------------------ navigation

    private bool CanPrevious => view switch
    {
        View.Month => MinDate is not { } min || Make(Y(active), M(active), 1) > Make(Y(min), M(min), 1),
        View.Year => MinDate is not { } min || Y(active) > Y(min),
        _ => MinDate is not { } min || YearPageStart > Y(min),
    };

    private bool CanNext => view switch
    {
        View.Month => MaxDate is not { } max || Make(Y(active), M(active), 1) < Make(Y(max), M(max), 1),
        View.Year => MaxDate is not { } max || Y(active) < Y(max),
        _ => MaxDate is not { } max || YearPageStart + YearsPerPage - 1 < Y(max),
    };

    private void Previous() => active = view switch
    {
        View.Month => Cal.AddMonths(active, -1),
        View.Year => Cal.AddYears(active, -1),
        _ => Cal.AddYears(active, -YearsPerPage),
    };

    private void Next() => active = view switch
    {
        View.Month => Cal.AddMonths(active, 1),
        View.Year => Cal.AddYears(active, 1),
        _ => Cal.AddYears(active, YearsPerPage),
    };

    private void TogglePeriod()
    {
        view = view == View.Month ? View.MultiYear : MinView == View.Month ? View.Month : view == View.Year ? View.MultiYear : MinView;
    }

    // ------------------------------------------------------------------ picking

    private async Task PickDay(DateTime date)
    {
        if (IsDateDisabled(date)) return;
        active = date;
        if (RangeSelection && RangeSelectionStrategy is not null)
        {
            var (start, end) = RangeSelectionStrategy(date);
            StartDate = start.Date;
            EndDate = end.Date;
            hover = null;
            await StartDateChanged.InvokeAsync(StartDate);
            await EndDateChanged.InvokeAsync(EndDate);
            await DatePicked.InvokeAsync(date);
            return;
        }
        if (RangeSelection)
        {
            if (StartDate is null || EndDate is not null || date < StartDate.Value.Date)
            {
                StartDate = date;
                EndDate = null;
                await StartDateChanged.InvokeAsync(date);
                await EndDateChanged.InvokeAsync(null);
                return;
            }
            EndDate = date;
            hover = null;
            await EndDateChanged.InvokeAsync(date);
            await DatePicked.InvokeAsync(date);
            return;
        }
        SelectedDate = date;
        await SelectedDateChanged.InvokeAsync(date);
        await DatePicked.InvokeAsync(date);
    }

    private async Task PickMonth(int month)
    {
        var day = Math.Min(D(active), DaysIn(Y(active), month));
        active = Clamp(Make(Y(active), month, day));
        if (MinView == View.Year)
        {
            await PickValue(Make(Y(active), month, 1));
            return;
        }
        view = View.Month;
    }

    private async Task PickYear(int year)
    {
        var day = Math.Min(D(active), DaysIn(year, M(active)));
        active = Clamp(Make(year, M(active), day));
        if (MinView == View.MultiYear)
        {
            await PickValue(Make(year, 1, 1));
            return;
        }
        view = View.Year;
    }

    private async Task PickValue(DateTime value)
    {
        if (RangeSelection)
        {
            await PickDay(value);
            return;
        }
        SelectedDate = value;
        await SelectedDateChanged.InvokeAsync(value);
        await DatePicked.InvokeAsync(value);
    }

    private void OnHover(DateTime? date)
    {
        if (RangeSelection && (RangeSelectionStrategy is not null || (StartDate is not null && EndDate is null))) hover = date;
    }

    // ------------------------------------------------------------------ keyboard (mat-calendar's)

    private async Task OnKeyDownAsync(KeyboardEventArgs e)
    {
        var before = active;
        switch (view)
        {
            case View.Month:
                active = e.Key switch
                {
                    "ArrowLeft" => active.AddDays(-1),
                    "ArrowRight" => active.AddDays(1),
                    "ArrowUp" => active.AddDays(-7),
                    "ArrowDown" => active.AddDays(7),
                    "Home" => active.AddDays(1 - D(active)),
                    "End" => active.AddDays(DaysIn(Y(active), M(active)) - D(active)),
                    "PageUp" => e.AltKey ? Cal.AddYears(active, -1) : Cal.AddMonths(active, -1),
                    "PageDown" => e.AltKey ? Cal.AddYears(active, 1) : Cal.AddMonths(active, 1),
                    _ => active,
                };
                if (e.Key is "Enter" or " ") await PickDay(active);
                break;
            case View.Year:
                active = e.Key switch
                {
                    "ArrowLeft" => Cal.AddMonths(active, -1),
                    "ArrowRight" => Cal.AddMonths(active, 1),
                    "ArrowUp" => Cal.AddMonths(active, -4),
                    "ArrowDown" => Cal.AddMonths(active, 4),
                    "Home" => Cal.AddMonths(active, 1 - M(active)),
                    "End" => Cal.AddMonths(active, 12 - M(active)),
                    "PageUp" => Cal.AddYears(active, e.AltKey ? -10 : -1),
                    "PageDown" => Cal.AddYears(active, e.AltKey ? 10 : 1),
                    _ => active,
                };
                if (e.Key is "Enter" or " ") await PickMonth(M(active));
                break;
            default:
                active = e.Key switch
                {
                    "ArrowLeft" => Cal.AddYears(active, -1),
                    "ArrowRight" => Cal.AddYears(active, 1),
                    "ArrowUp" => Cal.AddYears(active, -YearsPerRow),
                    "ArrowDown" => Cal.AddYears(active, YearsPerRow),
                    "Home" => Cal.AddYears(active, YearPageStart - Y(active)),
                    "End" => Cal.AddYears(active, YearPageStart + YearsPerPage - 1 - Y(active)),
                    "PageUp" => Cal.AddYears(active, e.AltKey ? -YearsPerPage * 10 : -YearsPerPage),
                    "PageDown" => Cal.AddYears(active, e.AltKey ? YearsPerPage * 10 : YearsPerPage),
                    _ => active,
                };
                if (e.Key is "Enter" or " ") await PickYear(Y(active));
                break;
        }
        if (active != before)
        {
            active = Clamp(active);
            if (IsPreview) hover = active;
            focusAfterRender = true;
        }
    }
}

/// <summary>What a custom calendar header (<c>HeaderTemplate</c>) shows and can do.</summary>
public sealed record PBCalendarHeaderContext(
    string Label,
    DateTime ActiveDate,
    PBCalendarViewMode CurrentView,
    bool CanPrevious,
    bool CanNext,
    Action Previous,
    Action Next,
    Action PreviousYear,
    Action NextYear,
    Action ToggleView);
