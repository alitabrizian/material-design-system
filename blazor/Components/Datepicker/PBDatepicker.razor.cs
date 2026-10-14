using System.Globalization;
using System.Linq.Expressions;
using Microsoft.JSInterop;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>A date the mask engine (design-system.js) reports, in the editor's calendar (Persian or Gregorian); Offset is in minutes.</summary>
public sealed record PBMaskDate(int Year, int Month, int Day, int Hour, int Minute, int Second, int Offset);

/// <summary>
/// mat-datepicker for Blazor, with the DevExpress Date Edit's features: bind <see cref="Date"/> to a
/// DateTime, DateOnly or DateTimeOffset (nullable or not); type, pick from an M3 calendar (or a scroll
/// picker), add a time section, clear button and placeholder, display/edit formats, date-time masks
/// (Up/Down and the mouse wheel change a section), min/max and disabled dates, month/year/decade picking,
/// a day cell template, and DateTimeOffset values shown in the browser's time zone.
/// </summary>
public partial class PBDatepicker<TValue> : DateEditorBase<TValue>
{
    [Parameter] public TValue? Date { get; set; }
    [Parameter] public EventCallback<TValue?> DateChanged { get; set; }
    [Parameter] public Expression<Func<TValue>>? DateExpression { get; set; }

    /// <summary>Month picks days; Year picks a month; Decade picks a year.</summary>
    [Parameter] public PBCalendarViewMode CalendarViewMode { get; set; }

    /// <summary>Adds hour/minute (and second) editors under the calendar, with Cancel/OK.</summary>
    [Parameter] public bool TimeSectionVisible { get; set; }

    /// <summary>Time section parts: <c>t</c> (culture short time, default), <c>T</c>, or a pattern like <c>HH:mm:ss</c>.</summary>
    [Parameter] public string TimeSectionFormat { get; set; } = "t";

    /// <summary>A date-time mask (e.g. <c>d</c>, <c>dd/MM/yyyy HH:mm</c>, <c>MMMM d, yyyy</c>, <c>yyyy-MM-dd HH:mm zzz</c>).</summary>
    [Parameter] public string? Mask { get; set; }

    [Parameter] public PBMaskCaretMode MaskCaretMode { get; set; } = PBMaskCaretMode.Advancing;

    /// <summary>Up/Down past a section's limit also changes the next section (Dec 31 → Jan 1 of the next year).</summary>
    [Parameter] public bool MaskCascadingSectionUpdates { get; set; } = true;

    [Parameter] public PBDatePickerDisplayMode PickerDisplayMode { get; set; }

    /// <summary>Scroll picker columns: d/dd (15), ddd (15 Fri), dddd (15 Friday), M/MM/MMMM (October), MMM (Oct), y… (2026).</summary>
    [Parameter] public string ScrollPickerFormat { get; set; } = "d MMMM yyyy";

    /// <summary>Time columns of the scroll picker (with <see cref="TimeSectionVisible"/>).</summary>
    [Parameter] public string TimeSectionScrollPickerFormat { get; set; } = "HH mm";

    private ElementReference input;
    private DateTime? pending;
    private bool scrollPickerMode;
    private bool maskInitialized;
    private string? maskSignature;

    private (DateTime Value, TimeSpan Offset)? Stored => DateValue<TValue>.Read(Date) is { } v ? ToClient(v.Value, v.Offset) : null;
    private DateTime? Current => Stored?.Value;
    private bool HasValue => Stored is not null;
    private bool WithOffset => DateValue<TValue>.IsOffset;

    private string EditFormat => Format ?? Mask ?? CalendarViewMode switch
    {
        PBCalendarViewMode.Year => "Y",
        PBCalendarViewMode.Decade => "yyyy",
        _ => TimeSectionVisible ? "g" : "d",
    };

    private string InputText
    {
        get
        {
            if (Stored is not { } stored) return "";
            var format = Focused ? EditFormat : DisplayFormat ?? EditFormat;
            return DateFormat.Format(stored.Value, stored.Offset, format, CurrentCulture, WithOffset);
        }
    }

    private string? ErrorMessage => ErrorText ?? ValidationMessage(DateExpression);
    private string? Hint => ErrorMessage ?? SupportingText;
    private bool Floating => HasValue || Focused || IsOpen || !string.IsNullOrEmpty(NullText);

    protected override bool DialogMode => scrollPickerMode || TouchUi;

    /// <summary>Raised while the user types: the parsed date, or null while the text is not a valid date.</summary>
    [Parameter] public EventCallback<TValue?> DateInput { get; set; }

    /// <summary>Picking stages the value (Cancel/OK) instead of applying it at once.</summary>
    private bool Staged => TimeSectionVisible || ShowActionButtons;

    protected override void OnOpening()
    {
        pending = Current ?? CalendarStartDate ?? DefaultPending();
    }

    private DateTime DefaultPending()
    {
        var today = DateTime.Today;
        if (MinDate is { } min && today < min) return min.Date;
        if (MaxDate is { } max && today > max) return max.Date;
        return today;
    }

    protected override async Task FocusInputAsync() => await DesignSystemJs.InvokeVoidAsync(JS, "focus", input, null);

    // ------------------------------------------------------------------ commit

    private async Task CommitAsync(DateTime? value)
    {
        var offset = Stored?.Offset ?? ClientOffset;
        Date = DateValue<TValue>.Write(value, EditOffset(offset));
        await DateChanged.InvokeAsync(Date);
        NotifyFieldChanged(DateExpression);
        await SyncInputAsync();
    }

    /// <summary>Puts the current text (or mask value) into the input, also when Blazor's diff would skip it.</summary>
    private async Task SyncInputAsync()
    {
        if (Mask is not null) await DesignSystemJs.InvokeVoidAsync(JS, "dateMaskUpdate", input, MaskOptions());
        else await DesignSystemJs.InvokeVoidAsync(JS, "setInputValue", input, InputText);
    }

    public async Task ClearAsync()
    {
        if (ReadOnly || IsDisabled) return;
        await CommitAsync(null);
        await FocusInputAsync();
    }

    private async Task OnTextInputAsync(ChangeEventArgs e)
    {
        if (!DateInput.HasDelegate || Mask is not null) return;
        var text = e.Value?.ToString() ?? "";
        DateTime? parsed = null;
        if (DateFormat.TryParse(text, EditFormat, CurrentCulture, WithOffset, out var value, out _) && IsAllowed(value)) parsed = Normalize(value);
        await DateInput.InvokeAsync(DateValue<TValue>.Write(parsed, EditOffset(Stored?.Offset ?? ClientOffset)));
    }

    private async Task OnTextChangedAsync(ChangeEventArgs e)
    {
        if (Mask is not null) return;
        var text = e.Value?.ToString() ?? "";
        if (string.IsNullOrWhiteSpace(text))
        {
            await CommitAsync(null);
            return;
        }
        if (DateFormat.TryParse(text, EditFormat, CurrentCulture, WithOffset, out var parsed, out _) && IsAllowed(parsed))
        {
            if (!DateFormat.HasTime(EditFormat, CurrentCulture) && Current is { } current && !TimeSectionVisible) parsed = parsed.Date + current.TimeOfDay;
            await CommitAsync(Normalize(parsed));
        }
        else
        {
            // Invalid or out-of-range input keeps the previous date (DevExpress behavior).
            await SyncInputAsync();
        }
    }

    /// <summary>Month/Year picking stores the first day of the period (of the editor's calendar).</summary>
    private DateTime Normalize(DateTime value) => CalendarViewMode switch
    {
        PBCalendarViewMode.Year => Cal.ToDateTime(Cal.GetYear(value), Cal.GetMonth(value), 1, 0, 0, 0, 0),
        PBCalendarViewMode.Decade => Cal.ToDateTime(Cal.GetYear(value), 1, 1, 0, 0, 0, 0),
        _ => value,
    };

    private void OnFocus()
    {
        Focused = true;
    }

    private async Task OnBlurAsync()
    {
        Focused = false;
        if (Mask is null) await SyncInputAsync();
    }

    private async Task OnInputKeyDownAsync(KeyboardEventArgs e)
    {
        if ((e.AltKey && e.Key == "ArrowDown") || e.Key == "F4") await SetOpenAsync(true);
        else if (e.Key == "Escape" && IsOpen) await SetOpenAsync(false);
        else if (e.AltKey && e.Key == "ArrowUp" && IsOpen) await SetOpenAsync(false);
    }

    // ------------------------------------------------------------------ dropdown

    private async Task OpenFromButtonAsync()
    {
        if (IsOpen)
        {
            await SetOpenAsync(false);
            return;
        }
        // Auto on a touch phone: the scroll picker in a modal dialog. ScrollPicker mode: a scroll picker dropdown.
        scrollPickerMode = PickerDisplayMode == PBDatePickerDisplayMode.Auto && await DesignSystemJs.InvokeAsync<bool>(JS, "isTouchPhone");
        await SetOpenAsync(true);
    }

    private async Task OnDatePickedAsync(DateTime date)
    {
        if (Staged)
        {
            var time = pending?.TimeOfDay ?? TimeSpan.Zero;
            pending = date.Date + time;
            return;
        }
        var keepTime = Current?.TimeOfDay ?? TimeSpan.Zero;
        await CommitAsync(Normalize(CalendarViewMode == PBCalendarViewMode.Month ? date.Date + keepTime : date));
        if (Mask is not null) await DesignSystemJs.InvokeVoidAsync(JS, "dateMaskUpdate", input, MaskOptions());
        await SetOpenAsync(false, focusInput: true);
    }

    private void OnCalendarSelected(DateTime? date)
    {
        if (Staged && date is { } d) pending = d.Date + (pending?.TimeOfDay ?? TimeSpan.Zero);
    }

    private async Task ApplyAsync()
    {
        if (pending is { } value && IsAllowed(value)) await CommitAsync(Normalize(value));
        await SetOpenAsync(false, focusInput: true);
    }

    private Task CancelAsync() => SetOpenAsync(false, focusInput: true);

    private Task NowAsync()
    {
        pending = DateTime.Now;
        if (WithOffset && !IgnoreClientTimeOffset) pending = DateTimeOffset.UtcNow.ToOffset(ClientOffset).DateTime;
        Calendar?.ShowDate(pending.Value);
        return Task.CompletedTask;
    }


    // ------------------------------------------------------------------ time section

    private bool TwelveHour => DateFormat.Expand(TimeSectionFormat, CurrentCulture).Contains('h');
    private bool ShowSeconds => DateFormat.Expand(TimeSectionFormat, CurrentCulture).Contains('s');

    private int DisplayHour => pending is { } p ? (TwelveHour ? (p.Hour % 12 == 0 ? 12 : p.Hour % 12) : p.Hour) : 0;

    private void SetTimePart(string part, ChangeEventArgs e)
    {
        if (pending is not { } p || !int.TryParse(e.Value?.ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var n)) return;
        pending = part switch
        {
            "hour" => p.Date.AddHours(TwelveHour ? (Math.Clamp(n, 1, 12) % 12) + (p.Hour >= 12 ? 12 : 0) : Math.Clamp(n, 0, 23)).AddMinutes(p.Minute).AddSeconds(p.Second),
            "minute" => p.Date.AddHours(p.Hour).AddMinutes(Math.Clamp(n, 0, 59)).AddSeconds(p.Second),
            _ => p.Date.AddHours(p.Hour).AddMinutes(p.Minute).AddSeconds(Math.Clamp(n, 0, 59)),
        };
    }

    private void SetHour(ChangeEventArgs e) => SetTimePart("hour", e);

    private void SetMinute(ChangeEventArgs e) => SetTimePart("minute", e);

    private void SetSecond(ChangeEventArgs e) => SetTimePart("second", e);

    private void SetPm(bool pm)
    {
        if (pending is not { } p || (p.Hour >= 12) == pm) return;
        pending = p.AddHours(pm ? 12 : -12);
    }

    private void OnScrollPickerChanged(DateTime value) => pending = value;

    private string ScrollFormat => TimeSectionVisible ? ScrollPickerFormat + " " + TimeSectionScrollPickerFormat : ScrollPickerFormat;

    // ------------------------------------------------------------------ mask

    private object MaskOptions()
    {
        var info = CurrentCulture.DateTimeFormat;
        var cal = info.Calendar;
        var stored = Stored;
        return new
        {
            sections = DateFormat.Sections(Mask!, CurrentCulture).Select(s => new { kind = s.Kind, length = s.Length, text = s.Text }),
            // The year, month and day of the editor's calendar: the mask edits Persian dates as Persian fields.
            calendar = CalendarSystem == PBCalendarSystem.Persian ? "persian" : "gregorian",
            value = stored is { } v ? new
            {
                year = cal.GetYear(v.Value),
                month = cal.GetMonth(v.Value),
                day = cal.GetDayOfMonth(v.Value),
                hour = v.Value.Hour,
                minute = v.Value.Minute,
                second = v.Value.Second,
                offset = (int)v.Offset.TotalMinutes,
            } : null,
            defaultOffset = (int)ClientOffset.TotalMinutes,
            caretMode = MaskCaretMode == PBMaskCaretMode.Advancing ? "advancing" : "regular",
            cascade = MaskCascadingSectionUpdates,
            monthNames = info.MonthNames.Take(12),
            monthAbbr = info.AbbreviatedMonthNames.Take(12),
            dayNames = info.DayNames,
            dayAbbr = info.AbbreviatedDayNames,
            am = info.AMDesignator,
            pm = info.PMDesignator,
            readOnly = ReadOnly || IsDisabled,
        };
    }

    [JSInvokable]
    public Task OnMaskChanged(PBMaskDate? value) => InvokeAsync(async () =>
    {
        if (value is null)
        {
            await CommitAsync(null);
            return;
        }
        DateTime date;
        try
        {
            date = Cal.ToDateTime(value.Year, value.Month, value.Day, value.Hour, value.Minute, value.Second, 0);
        }
        catch (ArgumentOutOfRangeException)
        {
            await SyncInputAsync();
            return;
        }
        if (!IsAllowed(date))
        {
            await SyncInputAsync();
            return;
        }
        var offset = TimeSpan.FromMinutes(value.Offset);
        Date = DateValue<TValue>.Write(date, WithOffset ? offset : TimeSpan.Zero);
        await DateChanged.InvokeAsync(Date);
        NotifyFieldChanged(DateExpression);
    });

    protected override async Task AfterRenderAsync(bool firstRender)
    {
        if (Mask is null)
        {
            if (maskInitialized)
            {
                maskInitialized = false;
                await DesignSystemJs.InvokeVoidAsync(JS, "dateMaskDispose", input);
            }
            return;
        }
        var signature = $"{Mask}|{CurrentCulture.Name}|{CalendarSystem}|{MaskCaretMode}|{MaskCascadingSectionUpdates}|{ReadOnly}|{IsDisabled}|{Stored}";
        if (!maskInitialized)
        {
            maskInitialized = true;
            maskSignature = signature;
            await DesignSystemJs.InvokeVoidAsync(JS, "dateMaskInit", input, SelfReference, MaskOptions());
        }
        else if (signature != maskSignature)
        {
            maskSignature = signature;
            await DesignSystemJs.InvokeVoidAsync(JS, "dateMaskUpdate", input, MaskOptions());
        }
    }

    protected override void OnClientOffsetChanged() => maskSignature = null;

    public override async ValueTask DisposeAsync()
    {
        if (maskInitialized) await DesignSystemJs.InvokeVoidAsync(JS, "dateMaskDispose", input);
        await base.DisposeAsync();
    }
}
