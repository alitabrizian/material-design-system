namespace PartoBita.DesignSystem.Docs.Navigation;

/// <summary>
/// A catalog entry. <c>Scene</c> is the card illustration under wwwroot/assets/screenshots: Angular
/// Material's own component scene images (MIT, see LICENSE.angular-components.txt there), and
/// <c>Summary</c> is its one-line description from the same categories page.
/// </summary>
public sealed record ComponentCatalogItem(string Name, string Route, string Scene, string Summary);

public static class ComponentCatalog
{
    public static readonly IReadOnlyList<ComponentCatalogItem> Items =
    [
        new("Autocomplete", "/autocomplete", "autocomplete", "Suggests relevant options as the user types."),
        new("Badge", "/badge", "badge", "A small value indicator that can be overlaid on another object."),
        new("Bottom Sheet", "/bottom-sheet", "bottom-sheet", "A large interactive panel primarily for mobile devices."),
        new("Button", "/button", "button", "An interactive button with a range of presentation options."),
        new("Button Toggle", "/button-toggle", "button-toggle", "A groupable on/off toggle for enabling and disabling options."),
        new("Card", "/card", "card", "A styled container for pieces of itemized content."),
        new("Checkbox", "/checkbox", "checkbox", "Captures boolean input with an optional indeterminate mode."),
        new("Chips", "/chips", "chips", "Presents a list of items as a set of small, tactile entities."),
        new("Core", "/core", "core", "Reusable parts used by other components in the library."),
        new("Datepicker", "/datepicker", "datepicker", "Captures dates, agnostic about their internal representation."),
        new("Dialog", "/dialog", "dialog", "A configurable modal that displays dynamic content."),
        new("Divider", "/divider", "divider", "A vertical or horizontal visual divider."),
        new("Expansion Panel", "/expansion-panel", "expansion", "A container which can be expanded to reveal more content."),
        new("Form Field", "/form-field", "form-field", "Wraps input fields so they are displayed consistently."),
        new("Grid List", "/grid-list", "grid-list", "A flexible structure for presenting content items in a grid."),
        new("Icon", "/icon", "icon", "Renders a specified icon."),
        new("Input", "/input", "input", "Enables native inputs to be used within a Form field."),
        new("List", "/list", "list", "Presents conventional lists of items."),
        new("Menu", "/menu", "menu", "A floating panel of nestable options."),
        new("Paginator", "/paginator", "paginator", "Controls for displaying paged data."),
        new("Progress Bar", "/progress-bar", "progress-bar", "A linear progress indicator."),
        new("Progress Spinner", "/progress-spinner", "progress-spinner", "A circular progress indicator."),
        new("Radio Button", "/radio-button", "radio", "Allows the user to select one option from a group."),
        new("Ripples", "/ripples", "ripple", "Directive for adding Material Design ripple effects"),
        new("Select", "/select", "select", "Allows the user to select one or more options using a dropdown."),
        new("Sidenav", "/sidenav", "sidenav", "A container for content that is fixed to one side of the screen."),
        new("Slide Toggle", "/slide-toggle", "slide-toggle", "Captures boolean values as a clickable and draggable switch."),
        new("Slider", "/slider", "slider", "Allows the user to input a value by dragging along a slider."),
        new("Snackbar", "/snackbar", "snack-bar", "Displays short actionable messages as an uninvasive alert."),
        new("Sort Header", "/sort-header", "sort", "Allows the user to configure how tabular data is sorted."),
        new("Stepper", "/stepper", "stepper", "Presents content as steps through which to progress."),
        new("Table", "/table", "table", "A configurable component for displaying tabular data."),
        new("Tabs", "/tabs", "tabs", "Only presents one view at a time from a provided set of views."),
        new("Timepicker", "/timepicker", "timepicker", "Allows the user to select a time of the day."),
        new("Toolbar", "/toolbar", "toolbar", "A container for top-level titles and controls."),
        new("Tooltip", "/tooltip", "tooltip", "Displays floating content when an object is hovered."),
        new("Tree", "/tree", "tree", "Presents hierarchical content as an expandable tree."),
    ];
}
