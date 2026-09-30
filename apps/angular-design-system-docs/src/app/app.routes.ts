import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

/** One lazily loaded page per component (pages/<path>/<path>-page.ts), in catalog order. */
export const routes: Routes = [
  { path: '', component: Home, title: 'Components · Design System' },
  {
    path: 'autocomplete',
    title: 'Autocomplete · Design System',
    loadComponent: () => import('./pages/autocomplete/autocomplete-page').then((m) => m.AutocompletePage),
  },
  {
    path: 'badge',
    title: 'Badge · Design System',
    loadComponent: () => import('./pages/badge/badge-page').then((m) => m.BadgePage),
  },
  {
    path: 'bottom-sheet',
    title: 'Bottom Sheet · Design System',
    loadComponent: () => import('./pages/bottom-sheet/bottom-sheet-page').then((m) => m.BottomSheetPage),
  },
  {
    path: 'button',
    title: 'Button · Design System',
    loadComponent: () => import('./pages/button/button-page').then((m) => m.ButtonPage),
  },
  {
    path: 'button-toggle',
    title: 'Button Toggle · Design System',
    loadComponent: () => import('./pages/button-toggle/button-toggle-page').then((m) => m.ButtonTogglePage),
  },
  {
    path: 'card',
    title: 'Card · Design System',
    loadComponent: () => import('./pages/card/card-page').then((m) => m.CardPage),
  },
  {
    path: 'checkbox',
    title: 'Checkbox · Design System',
    loadComponent: () => import('./pages/checkbox/checkbox-page').then((m) => m.CheckboxPage),
  },
  {
    path: 'chips',
    title: 'Chips · Design System',
    loadComponent: () => import('./pages/chips/chips-page').then((m) => m.ChipsPage),
  },
  {
    path: 'core',
    title: 'Core · Design System',
    loadComponent: () => import('./pages/core/core-page').then((m) => m.CorePage),
  },
  {
    path: 'datepicker',
    title: 'Datepicker · Design System',
    loadComponent: () => import('./pages/datepicker/datepicker-page').then((m) => m.DatepickerPage),
  },
  {
    path: 'dialog',
    title: 'Dialog · Design System',
    loadComponent: () => import('./pages/dialog/dialog-page').then((m) => m.DialogPage),
  },
  {
    path: 'divider',
    title: 'Divider · Design System',
    loadComponent: () => import('./pages/divider/divider-page').then((m) => m.DividerPage),
  },
  {
    path: 'expansion-panel',
    title: 'Expansion Panel · Design System',
    loadComponent: () => import('./pages/expansion-panel/expansion-panel-page').then((m) => m.ExpansionPanelPage),
  },
  {
    path: 'form-field',
    title: 'Form Field · Design System',
    loadComponent: () => import('./pages/form-field/form-field-page').then((m) => m.FormFieldPage),
  },
  {
    path: 'grid-list',
    title: 'Grid List · Design System',
    loadComponent: () => import('./pages/grid-list/grid-list-page').then((m) => m.GridListPage),
  },
  {
    path: 'icon',
    title: 'Icon · Design System',
    loadComponent: () => import('./pages/icon/icon-page').then((m) => m.IconPage),
  },
  {
    path: 'input',
    title: 'Input · Design System',
    loadComponent: () => import('./pages/input/input-page').then((m) => m.InputPage),
  },
  {
    path: 'list',
    title: 'List · Design System',
    loadComponent: () => import('./pages/list/list-page').then((m) => m.ListPage),
  },
  {
    path: 'menu',
    title: 'Menu · Design System',
    loadComponent: () => import('./pages/menu/menu-page').then((m) => m.MenuPage),
  },
  {
    path: 'paginator',
    title: 'Paginator · Design System',
    loadComponent: () => import('./pages/paginator/paginator-page').then((m) => m.PaginatorPage),
  },
  {
    path: 'progress-bar',
    title: 'Progress Bar · Design System',
    loadComponent: () => import('./pages/progress-bar/progress-bar-page').then((m) => m.ProgressBarPage),
  },
  {
    path: 'progress-spinner',
    title: 'Progress Spinner · Design System',
    loadComponent: () => import('./pages/progress-spinner/progress-spinner-page').then((m) => m.ProgressSpinnerPage),
  },
  {
    path: 'radio-button',
    title: 'Radio Button · Design System',
    loadComponent: () => import('./pages/radio-button/radio-button-page').then((m) => m.RadioButtonPage),
  },
  {
    path: 'ripples',
    title: 'Ripples · Design System',
    loadComponent: () => import('./pages/ripples/ripples-page').then((m) => m.RipplesPage),
  },
  {
    path: 'select',
    title: 'Select · Design System',
    loadComponent: () => import('./pages/select/select-page').then((m) => m.SelectPage),
  },
  {
    path: 'sidenav',
    title: 'Sidenav · Design System',
    loadComponent: () => import('./pages/sidenav/sidenav-page').then((m) => m.SidenavPage),
  },
  {
    path: 'slide-toggle',
    title: 'Slide Toggle · Design System',
    loadComponent: () => import('./pages/slide-toggle/slide-toggle-page').then((m) => m.SlideTogglePage),
  },
  {
    path: 'slider',
    title: 'Slider · Design System',
    loadComponent: () => import('./pages/slider/slider-page').then((m) => m.SliderPage),
  },
  {
    path: 'snackbar',
    title: 'Snackbar · Design System',
    loadComponent: () => import('./pages/snackbar/snackbar-page').then((m) => m.SnackbarPage),
  },
  {
    path: 'sort-header',
    title: 'Sort Header · Design System',
    loadComponent: () => import('./pages/sort-header/sort-header-page').then((m) => m.SortHeaderPage),
  },
  {
    path: 'stepper',
    title: 'Stepper · Design System',
    loadComponent: () => import('./pages/stepper/stepper-page').then((m) => m.StepperPage),
  },
  {
    path: 'table',
    title: 'Table · Design System',
    loadComponent: () => import('./pages/table/table-page').then((m) => m.TablePage),
  },
  {
    path: 'tabs',
    title: 'Tabs · Design System',
    loadComponent: () => import('./pages/tabs/tabs-page').then((m) => m.TabsPage),
  },
  {
    path: 'timepicker',
    title: 'Timepicker · Design System',
    loadComponent: () => import('./pages/timepicker/timepicker-page').then((m) => m.TimepickerPage),
  },
  {
    path: 'toolbar',
    title: 'Toolbar · Design System',
    loadComponent: () => import('./pages/toolbar/toolbar-page').then((m) => m.ToolbarPage),
  },
  {
    path: 'tooltip',
    title: 'Tooltip · Design System',
    loadComponent: () => import('./pages/tooltip/tooltip-page').then((m) => m.TooltipPage),
  },
  {
    path: 'tree',
    title: 'Tree · Design System',
    loadComponent: () => import('./pages/tree/tree-page').then((m) => m.TreePage),
  },
  { path: '**', redirectTo: '' },
];
