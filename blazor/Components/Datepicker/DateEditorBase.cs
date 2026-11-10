using System.Globalization;
using System.Linq.Expressions;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.JSInterop;

namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>
/// Shared by <see cref="PBDatepicker{TValue}"/> and <see cref="PBDateRangePicker{TValue}"/>: the calendar
/// options, display/edit formats, null text, clear button, the dropdown panel (in the top layer,
/// positioned under the field), validation messages from an EditForm, and client time offset handling.
/// </summary>
public abstract class DateEditorBase<TValue> : WorkspaceFieldComponentBase, IAsyncDisposable
{
    [Inject] protected IJSRuntime JS { get; set; } = default!;
    [CascadingParameter] protected EditContext? EditContext { get; set; }

    [Parameter] public DateTime? MinDate { get; set; }
    [Parameter] public DateTime? MaxDate { get; set; }

    /// <summary>Disables dates by custom logic: set <c>IsDisabled</c>.</summary>
    [Parameter] public Action<PBCustomDisabledDateEventArgs>? CustomDisabledDate { get; set; }

    /// <summary>Custom day cell content (highlight special dates).</summary>
    [Parameter] public RenderFragment<PBCalendarDayContext>? DayCellTemplate { get; set; }

    [Parameter] public DayOfWeek? FirstDayOfWeek { get; set; }

    /// <summary>Culture for formats, month and day names (defaults to the current culture).</summary>
    [Parameter] public CultureInfo? Culture { get; set; }

    /// <summary>Persian shows and edits Persian (Jalali, Shamsi) dates with the culture's Persian calendar (fa-IR's if it has none); values stay DateTime.</summary>
    [Parameter] public PBCalendarSystem CalendarSystem { get; set; }

    /// <summary>Format of the text while the editor is not focused (e.g. <c>D</c>, <c>dd MMM yyyy</c>).</summary>
    [Parameter] public string? DisplayFormat { get; set; }

    /// <summary>Format of the text while the user edits it (and the display format when DisplayFormat is unset).</summary>
    [Parameter] public string? Format { get; set; }

    /// <summary>Placeholder text while the value is empty.</summary>
    [Parameter] public string? NullText { get; set; }

    [Parameter] public PBClearButtonDisplayMode ClearButtonDisplayMode { get; set; }
    [Parameter] public bool ReadOnly { get; set; }
    [Parameter] public bool Disabled { get; set; }
    [Parameter] public bool Required { get; set; }

    /// <summary>Shows the calendar button (Alt+Down opens the dropdown either way).</summary>
    [Parameter] public bool ShowDropDownButton { get; set; } = true;

    [Parameter] public bool DropDownVisible { get; set; }
    [Parameter] public EventCallback<bool> DropDownVisibleChanged { get; set; }

    /// <summary>Disables typing but keeps the calendar (Angular's "input disabled" datepicker).</summary>
    [Parameter] public bool InputDisabled { get; set; }

    /// <summary>Disables the calendar button and dropdown but keeps typing (Angular's "popup disabled").</summary>
    [Parameter] public bool DropDownDisabled { get; set; }

    /// <summary>Material icon name of the dropdown button (e.g. <c>event</c>, <c>today</c>).</summary>
    [Parameter] public string? ToggleIcon { get; set; }

    /// <summary>Custom content of the dropdown button (any icon or SVG).</summary>
    [Parameter] public RenderFragment? ToggleIconTemplate { get; set; }

    /// <summary>Shows the calendar in a modal dialog with larger cells (mat-datepicker touchUi).</summary>
    [Parameter] public bool TouchUi { get; set; }

    /// <summary>Cancel/Apply buttons: picking only stages the value until Apply.</summary>
    [Parameter] public bool ShowActionButtons { get; set; }

    /// <summary>Replaces the calendar header (see <see cref="PBCalendarHeaderContext"/>).</summary>
    [Parameter] public RenderFragment<PBCalendarHeaderContext>? CalendarHeaderTemplate { get; set; }

    /// <summary>The date the calendar opens at while the value is empty.</summary>
    [Parameter] public DateTime? CalendarStartDate { get; set; }

    /// <summary>The view the calendar opens in (e.g. Decade to start from years).</summary>
    [Parameter] public PBCalendarViewMode? CalendarStartView { get; set; }

    /// <summary>Keeps DateTimeOffset values in their own offset instead of converting them to the browser's time zone.</summary>
    [Parameter] public bool IgnoreClientTimeOffset { get; set; }

    protected readonly string PanelId = "pb-date-panel-" + Guid.NewGuid().ToString("N")[..8];
    protected ElementReference Panel;
    protected bool Focused;
    protected PBCalendar? Calendar;
    private DotNetObjectReference<DateEditorBase<TValue>>? selfReference;
    private bool positioned;
    // The last DropDownVisible parameter value (not the open state): a re-render with an unbound
    // parameter must not close a popup opened by the user or by OpenAsync.
    private bool lastDropDownVisible;
    private bool focusCalendar;

    /// <summary>The browser's UTC offset (from JS; the server's until the first render).</summary>
    protected TimeSpan ClientOffset { get; private set; } = TimeZoneInfo.Local.GetUtcOffset(DateTime.Now);

    protected CultureInfo CurrentCulture => DateCulture.For(Culture ?? CultureInfo.CurrentCulture, CalendarSystem);

    /// <summary>The calendar of the shown year, month and day fields.</summary>
    protected System.Globalization.Calendar Cal => CurrentCulture.DateTimeFormat.Calendar;
    protected bool IsDisabled => Disabled || IsDisabledAttribute;
    protected bool IsRequired => Required || IsRequiredAttribute;
    protected bool IsOpen { get; private set; }

    protected DotNetObjectReference<DateEditorBase<TValue>> SelfReference => selfReference ??= DotNetObjectReference.Create(this);

    /// <summary>The validation message for <paramref name="expression"/> from the cascading EditForm, if any.</summary>
    protected string? ValidationMessage(Expression<Func<TValue>>? expression)
    {
        if (EditContext is null || expression is null) return null;
        var message = EditContext.GetValidationMessages(FieldIdentifier.Create(expression)).FirstOrDefault();
        return message;
    }

    protected void NotifyFieldChanged(Expression<Func<TValue>>? expression)
    {
        if (EditContext is not null && expression is not null) EditContext.NotifyFieldChanged(FieldIdentifier.Create(expression));
    }

    protected override void OnParametersSet()
    {
        if (DropDownVisible != lastDropDownVisible)
        {
            lastDropDownVisible = DropDownVisible;
            if (DropDownVisible != IsOpen) _ = InvokeAsync(() => SetOpenAsync(DropDownVisible));
        }
    }

    /// <summary>Clamps a date to the min/max range; null when it is disabled.</summary>
    protected bool IsAllowed(DateTime value)
    {
        if (MinDate is { } min && value.Date < min.Date) return false;
        if (MaxDate is { } max && value.Date > max.Date) return false;
        if (CustomDisabledDate is null) return true;
        var args = new PBCustomDisabledDateEventArgs(value.Date);
        CustomDisabledDate(args);
        return !args.IsDisabled;
    }

    // ------------------------------------------------------------------ client time offset

    /// <summary>A stored value as the browser shows it.</summary>
    protected (DateTime Value, TimeSpan Offset) ToClient(DateTime value, TimeSpan offset)
    {
        if (!DateValue<TValue>.IsOffset || IgnoreClientTimeOffset || offset == ClientOffset) return (value, offset);
        var converted = new DateTimeOffset(DateTime.SpecifyKind(value, DateTimeKind.Unspecified), offset).ToOffset(ClientOffset);
        return (converted.DateTime, ClientOffset);
    }

    /// <summary>The offset a value the user typed or picked gets.</summary>
    protected TimeSpan EditOffset(TimeSpan current) =>
        DateValue<TValue>.IsOffset && !IgnoreClientTimeOffset ? ClientOffset : current;

    // ------------------------------------------------------------------ dropdown

    protected Task ToggleAsync() => SetOpenAsync(!IsOpen);

    public Task OpenAsync() => SetOpenAsync(true);

    public Task CloseAsync() => SetOpenAsync(false);

    [JSInvokable]
    public Task CloseFromOutside() => InvokeAsync(() => SetOpenAsync(false));

    protected virtual void OnOpening() { }

    protected async Task SetOpenAsync(bool open, bool focusInput = false)
    {
        if (open && (IsDisabled || ReadOnly || DropDownDisabled)) return;
        if (open == IsOpen) return;
        var wasPositioned = positioned;
        var panel = Panel;
        IsOpen = open;
        if (open)
        {
            OnOpening();
            focusCalendar = true;
        }
        else positioned = false;
        if (!open && wasPositioned) await DesignSystemJs.InvokeVoidAsync(JS, "unposition", panel);
        await DropDownVisibleChanged.InvokeAsync(open);
        StateHasChanged();
        if (!open && focusInput) await FocusInputAsync();
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            var minutes = await DesignSystemJs.InvokeAsync<int?>(JS, "clientTimeOffset");
            if (minutes is { } m && TimeSpan.FromMinutes(m) != ClientOffset)
            {
                ClientOffset = TimeSpan.FromMinutes(m);
                OnClientOffsetChanged();
                StateHasChanged();
            }
        }
        if (IsOpen && !positioned && UsesPopover)
        {
            positioned = true;
            await DesignSystemJs.InvokeVoidAsync(JS, "position", Panel, null, new
            {
                x = "start",
                y = "below",
                anchorClosest = ".pb-date-edit",
                anchorSelector = ".pb-form-field__wrapper",
                dotNet = SelfReference,
                closeMethod = nameof(CloseFromOutside),
            });
        }
        if (IsOpen && focusCalendar)
        {
            focusCalendar = false;
            if (Calendar is not null) await Calendar.FocusAsync();
            else await DesignSystemJs.InvokeVoidAsync(JS, "focusFirst", Panel, "[tabindex='0'], button:not([disabled])");
        }
        if (IsOpen && DialogMode && !dialogShown)
        {
            dialogShown = true;
            await DesignSystemJs.InvokeVoidAsync(JS, "showDialog", Panel, SelfReference, true);
        }
        if (!IsOpen) dialogShown = false;
        await AfterRenderAsync(firstRender);
    }

    private bool dialogShown;

    /// <summary>The dropdown is a modal dialog (TouchUi, or the scroll picker on a touch phone).</summary>
    protected virtual bool DialogMode => TouchUi;

    /// <summary>Escape or a backdrop click on the dialog.</summary>
    [JSInvokable]
    public Task OnCancel() => InvokeAsync(() => SetOpenAsync(false, focusInput: true));

    protected string DropDownIcon(string fallback) => ToggleIcon ?? fallback;

    /// <summary>The icon font of the dropdown icon (a ToggleIcon is a PartoBita icon name too).</summary>
    protected string DropDownIconClass => "pb-icons";

    /// <summary>False when the dropdown is a modal dialog (scroll picker on touch devices).</summary>
    protected virtual bool UsesPopover => !DialogMode;

    protected virtual void OnClientOffsetChanged() { }

    /// <summary>Returns focus to the editor's input (after Escape or a pick).</summary>
    protected abstract Task FocusInputAsync();

    protected virtual Task AfterRenderAsync(bool firstRender) => Task.CompletedTask;

    protected async Task OnPanelKeyDownAsync(KeyboardEventArgs e)
    {
        if (e.Key == "Escape") await SetOpenAsync(false, focusInput: true);
    }

    public virtual async ValueTask DisposeAsync()
    {
        if (positioned) await DesignSystemJs.InvokeVoidAsync(JS, "unposition", Panel);
        selfReference?.Dispose();
        GC.SuppressFinalize(this);
    }
}
