namespace Design.Components;

/// <summary>
/// mat-timepicker's field: like <see cref="PBDatepicker"/> but with <c>&lt;input type="time"&gt;</c> and a
/// clock toggle.
/// </summary>
public class PBTimepicker : PBDatepicker
{
    protected override string InputType => "time";
    protected override string ToggleIcon => "schedule";
    protected override string ToggleLabel => "Open time picker";
}
