namespace Design.Demo.Navigation;

public sealed record ComponentCatalogItem(string Name, string Route, string Icon, string Description, bool Featured = false);

public static class ComponentCatalog
{
    public static readonly IReadOnlyList<ComponentCatalogItem> Items =
    [
        new("Autocomplete", "/autocomplete", "⌕", "Suggest relevant options as you type."),
        new("Badge", "/badge", "•", "Show a compact value or status indicator."),
        new("Bottom Sheet", "/bottom-sheet", "▔", "Present actions in a mobile-friendly panel."),
        new("Button", "/button", "→", "Trigger actions and commands."),
        new("Button Toggle", "/button-toggle", "⇄", "Switch between grouped on and off states."),
        new("Card", "/card", "▣", "Group related content together."),
        new("Checkbox", "/checkbox", "✓", "Select one or more options."),
        new("Chips", "/chips", "●", "Display compact interactive selections."),
        new("Core", "/core", "◆", "Share foundational styles and behavior."),
        new("Datepicker", "/datepicker", "□", "Choose a date from a calendar."),
        new("Dialog", "/dialog", "▢", "Focus attention on an important task."),
        new("Divider", "/divider", "—", "Separate related content sections."),
        new("Expansion Panel", "/expansion-panel", "⌄", "Reveal or hide additional content."),
        new("Form Field", "/form-field", "▤", "Combine labels, controls, and hints."),
        new("Grid List", "/grid-list", "▦", "Arrange content in a structured grid."),
        new("Icon", "/icon", "✦", "Represent an action or concept visually."),
        new("Input", "/input", "|", "Capture a value from the user."),
        new("List", "/list", "☷", "Present a vertical collection of items."),
        new("Menu", "/menu", "☰", "Expose a list of contextual actions."),
        new("Paginator", "/paginator", "‹›", "Move through a set of results."),
        new("Progress Bar", "/progress-bar", "▰", "Show progress across a horizontal track."),
        new("Progress Spinner", "/progress-spinner", "◌", "Show an indeterminate loading state."),
        new("Radio Button", "/radio-button", "◉", "Choose one option from a group."),
        new("Ripples", "/ripples", "◎", "Give interactions tactile visual feedback."),
        new("Select", "/select", "⌄", "Choose one value from a list."),
        new("Sidenav", "/sidenav", "▐", "Navigate through a vertical side panel."),
        new("Slide Toggle", "/slide-toggle", "◐", "Toggle a setting with a sliding control."),
        new("Slider", "/slider", "━", "Select a value within a range."),
        new("Snackbar", "/snackbar", "▰", "Give brief feedback after an action."),
        new("Sort Header", "/sort-header", "↕", "Sort tabular data by a column."),
        new("Stepper", "/stepper", "1·2·3", "Guide users through sequential steps."),
        new("Table", "/table", "▤", "Display structured data in rows and columns."),
        new("Tabs", "/tabs", "☰", "Switch between related views."),
        new("Timepicker", "/timepicker", "◷", "Choose a time from a clock interface."),
        new("Toolbar", "/toolbar", "▬", "Group navigation and actions in a bar."),
        new("Tooltip", "/tooltip", "?", "Explain an element on hover or focus."),
        new("Tree", "/tree", "⌘", "Display hierarchical information."),
    ];
}
