# Contract: Public Razor component API

Legend: **kept** = existing parameter that keeps working; **new** = added. All components keep `Label`,
`ChildContent` and attribute splatting (`AdditionalAttributes`) from `WorkspaceComponentBase`.
Each row lists the Angular Material equivalent that sets the reference values.

| Component | Angular ref | Parameters | Semantics / keyboard |
|-----------|-------------|------------|----------------------|
| PBButton | matButton / matIconButton / matFab | kept: Variant (Text, Filled, Tonal, Outlined, Elevated, Icon, Fab, MiniFab, ExtendedFab), Href, Disabled, DisabledInteractive, ShowProgress, ProgressIndicator, IconStart, IconEnd, Type | native button/a |
| PBButtonToggleGroup / PBButtonToggle | mat-button-toggle-group | kept: Multiple, Value(s), Disabled, Hide*SelectionIndicator; toggle: Value, Disabled, Checked | radiogroup+radio (aria-checked) or button (aria-pressed); arrows rove in single mode |
| PBCheckbox | mat-checkbox | kept: Label + input attrs; new: Indeterminate | native checkbox; `aria-checked=mixed` when indeterminate |
| PBRadioGroup / PBRadioButton | mat-radio-group / mat-radio-button | kept: Label + input attrs | native radios; arrows via browser radio-group semantics (shared `name`) |
| PBSlideToggle | mat-slide-toggle | kept: Label + input attrs; new: HideIcon | input role=switch; whole track + label clickable |
| PBSlider | mat-slider | kept: Label + input attrs (min, max, step, value, disabled) | native range (arrows, Home/End, PageUp/Down) |
| PBFormField | mat-form-field | kept: Label, SupportingText, ErrorText, ChildContent; new: Appearance (Fill, Outline), Prefix, Suffix | label wraps control |
| PBInput | matInput | kept: Label, SupportingText, ErrorText + input attrs; new: Appearance, Prefix, Suffix | native input |
| PBSelect\<TValue\> | mat-select | new: Value/ValueChanged, Placeholder, Disabled, Appearance; kept: Label, SupportingText, ErrorText | combobox + listbox; arrows, Home/End, Enter/Space, Escape, typeahead |
| PBOption\<TValue\> | mat-option | new: Value, Disabled, ChildContent | role=option, aria-selected |
| PBAutoComplete\<TItem\> | mat-autocomplete | kept: all | combobox/listbox (unchanged) |
| PBDatepicker / PBTimepicker | mat-datepicker / mat-timepicker (field shell) | kept: Label, SupportingText, ErrorText + input attrs; new: Appearance | native date/time input + toggle button |
| PBCard (+ PBCardHeader, PBCardContent, PBCardActions) | mat-card | kept: Variant (default now **Elevated**, like mat-card "raised"); new sub-components: Header(Title, Subtitle, Avatar), Actions(Align) | article |
| PBDivider | mat-divider | new: Vertical, Inset | role=separator, aria-orientation |
| PBExpansionPanel (+ PBAccordion) | mat-expansion-panel / mat-accordion | kept: Label; new: Description, Expanded/ExpandedChanged, Disabled; accordion: Multi | header button aria-expanded/aria-controls; region |
| PBGridList / PBGridTile | mat-grid-list / mat-grid-tile | new: Cols, RowHeight, Gutter; tile: Colspan, Rowspan, Header, Footer | list/listitem |
| PBIcon | mat-icon | kept: Label; new: FontSet (Icons, Symbols) | role=img with label, else aria-hidden |
| PBList / PBListItem | mat-list / mat-list-item | new item: Title (or ChildContent), Subtitle, Line3, Leading, Trailing, Href, OnClick, Disabled, Selected; list: new Dense? no | list/listitem; interactive items are buttons/links |
| PBMenu / PBMenuItem | mat-menu / mat-menu-item | kept: Trigger, XPosition, IsOpen; new: YPosition; item: Icon, Disabled, Role (menuitem, menuitemradio, menuitemcheckbox), Checked, OnClick, Trailing | menu/menuitem*; arrows, Home/End, Escape returns focus |
| PBPaginator | mat-paginator | new: Length, PageIndex/PageIndexChanged, PageSize/PageSizeChanged, PageSizeOptions, ShowFirstLastButtons, HidePageSize, Disabled | nav; icon buttons with labels |
| PBProgressBar | mat-progress-bar | kept: Value, Indeterminate, BufferValue | role=progressbar |
| PBProgressSpinner | mat-progress-spinner | kept: Diameter; new: StrokeWidth, Value (null = indeterminate) | role=progressbar |
| PBRipples | matRipple | new: Centered, Unbounded, Disabled | presentational |
| PBSidenav | mat-sidenav | kept: Mode (Standard, Over), Opened/OpenedChanged; new: Position (Start, End) | complementary; Escape closes Over mode |
| PBSnackbar | MatSnackBar | new: Open/OpenChanged, ActionLabel, OnAction, Duration; kept: ChildContent (message) | role=status, aria-live=polite |
| PBSortHeader | mat-sort-header | kept: Label; new: Direction/DirectionChanged, Arrow position | button; aria-sort on parent th is the consumer's job (documented) |
| PBStepper / PBStep | mat-stepper / mat-step | kept: Orientation; new: SelectedIndex/SelectedIndexChanged, Linear; step: Label, Completed, Optional, HasError, ChildContent | tablist-like headers (aria-selected), arrows move focus |
| PBTable | mat-table (native table flavour) | kept: ChildContent (now `thead`/`tbody`/`tr` passed as-is, no forced tbody) | native table |
| PBTabs / PBTab | mat-tab-group / mat-tab | new: SelectedIndex/SelectedIndexChanged, Stretch; tab: Label, Icon, Disabled, ChildContent (panel) | tablist/tab/tabpanel; arrows, Home/End, Enter/Space |
| PBToolbar | mat-toolbar | kept | header |
| PBTooltip | matTooltip | kept: Label (message); new: Position (Below default, Above, Before, After) | role=tooltip, aria-describedby on the wrapper |
| PBTree / PBTreeNode | mat-tree (nested) | new node: Label, Icon, Expanded/ExpandedChanged, ChildContent (children) | tree/treeitem/group, aria-expanded, aria-level; arrows per CDK |
| PBBadge | matBadge | kept: Variant, Size, Overlay | presentational (content read with host) |
| PBChips / PBChip | mat-chip-set, mat-chip-listbox, mat-chip-grid / mat-chip, mat-chip-option, mat-chip-row | new chip: Variant (Assist, Filter, Input), Selected/SelectedChanged, Removable, OnRemove, Disabled, Icon | set role=list, or listbox for filter; option aria-selected |
| PBDialog | MatDialog | kept: Label (title), ChildContent; new: Open/OpenChanged, Actions, DisableClose | native dialog (modal): focus trap, Escape, labelled by title |
| PBBottomSheet | MatBottomSheet | kept: Dismissed, Label | dialog-like region; Escape and scrim click dismiss |
| PBCore | (typography root) | kept | section |
