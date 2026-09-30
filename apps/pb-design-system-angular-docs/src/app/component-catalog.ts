/**
 * A catalog entry. scene is the card illustration under assets/screenshots (Angular Material's own
 * component scene images, MIT, shared with the Blazor docs), and summary is its one-line description
 * from the same categories page.
 */
export interface ComponentCatalogItem {
  name: string;
  /** Route and folder name under pages/. */
  path: string;
  scene: string;
  summary: string;
}

export const COMPONENT_CATALOG: readonly ComponentCatalogItem[] = [
  { name: 'Autocomplete', path: 'autocomplete', scene: 'autocomplete', summary: 'Suggests relevant options as the user types.' },
  { name: 'Badge', path: 'badge', scene: 'badge', summary: 'A small value indicator that can be overlaid on another object.' },
  { name: 'Bottom Sheet', path: 'bottom-sheet', scene: 'bottom-sheet', summary: 'A large interactive panel primarily for mobile devices.' },
  { name: 'Button', path: 'button', scene: 'button', summary: 'An interactive button with a range of presentation options.' },
  { name: 'Button Toggle', path: 'button-toggle', scene: 'button-toggle', summary: 'A groupable on/off toggle for enabling and disabling options.' },
  { name: 'Card', path: 'card', scene: 'card', summary: 'A styled container for pieces of itemized content.' },
  { name: 'Checkbox', path: 'checkbox', scene: 'checkbox', summary: 'Captures boolean input with an optional indeterminate mode.' },
  { name: 'Chips', path: 'chips', scene: 'chips', summary: 'Presents a list of items as a set of small, tactile entities.' },
  { name: 'Core', path: 'core', scene: 'core', summary: 'Reusable parts used by other components in the library.' },
  { name: 'Datepicker', path: 'datepicker', scene: 'datepicker', summary: 'Captures dates, agnostic about their internal representation.' },
  { name: 'Dialog', path: 'dialog', scene: 'dialog', summary: 'A configurable modal that displays dynamic content.' },
  { name: 'Divider', path: 'divider', scene: 'divider', summary: 'A vertical or horizontal visual divider.' },
  { name: 'Expansion Panel', path: 'expansion-panel', scene: 'expansion', summary: 'A container which can be expanded to reveal more content.' },
  { name: 'Form Field', path: 'form-field', scene: 'form-field', summary: 'Wraps input fields so they are displayed consistently.' },
  { name: 'Grid List', path: 'grid-list', scene: 'grid-list', summary: 'A flexible structure for presenting content items in a grid.' },
  { name: 'Icon', path: 'icon', scene: 'icon', summary: 'Renders a specified icon.' },
  { name: 'Input', path: 'input', scene: 'input', summary: 'Enables native inputs to be used within a Form field.' },
  { name: 'List', path: 'list', scene: 'list', summary: 'Presents conventional lists of items.' },
  { name: 'Menu', path: 'menu', scene: 'menu', summary: 'A floating panel of nestable options.' },
  { name: 'Paginator', path: 'paginator', scene: 'paginator', summary: 'Controls for displaying paged data.' },
  { name: 'Progress Bar', path: 'progress-bar', scene: 'progress-bar', summary: 'A linear progress indicator.' },
  { name: 'Progress Spinner', path: 'progress-spinner', scene: 'progress-spinner', summary: 'A circular progress indicator.' },
  { name: 'Radio Button', path: 'radio-button', scene: 'radio', summary: 'Allows the user to select one option from a group.' },
  { name: 'Ripples', path: 'ripples', scene: 'ripple', summary: 'Directive for adding Material Design ripple effects' },
  { name: 'Select', path: 'select', scene: 'select', summary: 'Allows the user to select one or more options using a dropdown.' },
  { name: 'Sidenav', path: 'sidenav', scene: 'sidenav', summary: 'A container for content that is fixed to one side of the screen.' },
  { name: 'Slide Toggle', path: 'slide-toggle', scene: 'slide-toggle', summary: 'Captures boolean values as a clickable and draggable switch.' },
  { name: 'Slider', path: 'slider', scene: 'slider', summary: 'Allows the user to input a value by dragging along a slider.' },
  { name: 'Snackbar', path: 'snackbar', scene: 'snack-bar', summary: 'Displays short actionable messages as an uninvasive alert.' },
  { name: 'Sort Header', path: 'sort-header', scene: 'sort', summary: 'Allows the user to configure how tabular data is sorted.' },
  { name: 'Stepper', path: 'stepper', scene: 'stepper', summary: 'Presents content as steps through which to progress.' },
  { name: 'Table', path: 'table', scene: 'table', summary: 'A configurable component for displaying tabular data.' },
  { name: 'Tabs', path: 'tabs', scene: 'tabs', summary: 'Only presents one view at a time from a provided set of views.' },
  { name: 'Timepicker', path: 'timepicker', scene: 'timepicker', summary: 'Allows the user to select a time of the day.' },
  { name: 'Toolbar', path: 'toolbar', scene: 'toolbar', summary: 'A container for top-level titles and controls.' },
  { name: 'Tooltip', path: 'tooltip', scene: 'tooltip', summary: 'Displays floating content when an object is hovered.' },
  { name: 'Tree', path: 'tree', scene: 'tree', summary: 'Presents hierarchical content as an expandable tree.' },
];
