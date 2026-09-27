namespace Design.Demo.Navigation;

/// <summary>A catalog entry; <c>Icon</c> is a Material Icons ligature name.</summary>
public sealed record ComponentCatalogItem(string Name, string Route, string Icon, string Description, bool Featured = false);

public static class ComponentCatalog
{
    public static readonly IReadOnlyList<ComponentCatalogItem> Items =
    [
        new("Autocomplete", "/autocomplete", "search", "Suggest relevant options as you type."),
        new("Badge", "/badge", "notifications", "Show a compact value or status indicator."),
        new("Bottom Sheet", "/bottom-sheet", "vertical_align_bottom", "Present actions in a mobile-friendly panel."),
        new("Button", "/button", "smart_button", "Trigger actions and commands."),
        new("Button Toggle", "/button-toggle", "toggle_on", "Switch between grouped on and off states."),
        new("Card", "/card", "crop_landscape", "Group related content together."),
        new("Checkbox", "/checkbox", "check_box", "Select one or more options."),
        new("Chips", "/chips", "label", "Display compact interactive selections."),
        new("Core", "/core", "palette", "Share foundational styles and behavior."),
        new("Datepicker", "/datepicker", "calendar_today", "Choose a date from a calendar."),
        new("Dialog", "/dialog", "web_asset", "Focus attention on an important task."),
        new("Divider", "/divider", "horizontal_rule", "Separate related content sections."),
        new("Expansion Panel", "/expansion-panel", "expand_more", "Reveal or hide additional content."),
        new("Form Field", "/form-field", "text_fields", "Combine labels, controls, and hints."),
        new("Grid List", "/grid-list", "grid_view", "Arrange content in a structured grid."),
        new("Icon", "/icon", "insert_emoticon", "Represent an action or concept visually."),
        new("Input", "/input", "input", "Capture a value from the user."),
        new("List", "/list", "list", "Present a vertical collection of items."),
        new("Menu", "/menu", "menu", "Expose a list of contextual actions."),
        new("Paginator", "/paginator", "last_page", "Move through a set of results."),
        new("Progress Bar", "/progress-bar", "linear_scale", "Show progress across a horizontal track."),
        new("Progress Spinner", "/progress-spinner", "autorenew", "Show an indeterminate loading state."),
        new("Radio Button", "/radio-button", "radio_button_checked", "Choose one option from a group."),
        new("Ripples", "/ripples", "touch_app", "Give interactions tactile visual feedback."),
        new("Select", "/select", "arrow_drop_down_circle", "Choose one value from a list."),
        new("Sidenav", "/sidenav", "view_sidebar", "Navigate through a vertical side panel."),
        new("Slide Toggle", "/slide-toggle", "toggle_off", "Toggle a setting with a sliding control."),
        new("Slider", "/slider", "tune", "Select a value within a range."),
        new("Snackbar", "/snackbar", "announcement", "Give brief feedback after an action."),
        new("Sort Header", "/sort-header", "sort", "Sort tabular data by a column."),
        new("Stepper", "/stepper", "linear_scale", "Guide users through sequential steps."),
        new("Table", "/table", "table_chart", "Display structured data in rows and columns."),
        new("Tabs", "/tabs", "tab", "Switch between related views."),
        new("Timepicker", "/timepicker", "schedule", "Choose a time from a clock interface."),
        new("Toolbar", "/toolbar", "web", "Group navigation and actions in a bar."),
        new("Tooltip", "/tooltip", "info", "Explain an element on hover or focus."),
        new("Tree", "/tree", "account_tree", "Display hierarchical information."),
    ];
}
