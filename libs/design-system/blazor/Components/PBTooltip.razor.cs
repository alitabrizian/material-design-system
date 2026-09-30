namespace PartoBita.DesignSystem.Blazor.Components;

/// <summary>matTooltipPosition values.</summary>
public enum PBTooltipPosition { Below, Above, Before, After }

/// <summary>
/// matTooltip: wrap the trigger as child content; <see cref="WorkspaceComponentBase.Label"/> is the message.
/// Shown on hover and keyboard focus, hidden on Escape, and linked to the trigger with
/// <c>aria-describedby</c>. Like matTooltip, a natively disabled trigger shows no tooltip; use
/// <c>PBButton DisabledInteractive</c> to keep it.
/// </summary>
public partial class PBTooltip : WorkspaceComponentBase { }
