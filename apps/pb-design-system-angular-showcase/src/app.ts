import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PB_THEMES,
  PbAccordion,
  PbAutocomplete,
  PbBadge,
  PbBottomSheet,
  PbButton,
  PbButtonToggle,
  PbButtonToggleGroup,
  PbCard,
  PbCardActions,
  PbCardContent,
  PbCardHeader,
  PbCell,
  PbCheckbox,
  PbChip,
  PbChips,
  PbDatepicker,
  PbDialog,
  PbDivider,
  PbExpansionPanel,
  PbGridList,
  PbGridTile,
  PbIcon,
  PbInput,
  PbList,
  PbListItem,
  PbMenu,
  PbMenuItem,
  PbOption,
  PbPaginator,
  PbPrefix,
  PbProgressBar,
  PbProgressSpinner,
  PbRadioButton,
  PbRadioGroup,
  PbRipple,
  PbSelect,
  PbSlider,
  PbSlideToggle,
  PbSnackbar,
  PbStep,
  PbStepper,
  PbStepperNext,
  PbStepperPrevious,
  PbTab,
  PbTable,
  PbTableColumn,
  PbTabs,
  PbTheme,
  PbThemeService,
  PbTimepicker,
  PbToolbar,
  PbTooltip,
  PbTree,
  PbTreeNode,
} from '@partobita/design-system-angular';

interface Element {
  [key: string]: unknown;
  position: number;
  name: string;
  weight: number;
  symbol: string;
}

/** Every @partobita/design-system-angular component on one page, for review and visual checks. */
@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    PbAccordion, PbAutocomplete, PbBadge, PbBottomSheet, PbButton, PbButtonToggle, PbButtonToggleGroup,
    PbCard, PbCardActions, PbCardContent, PbCardHeader, PbCell, PbCheckbox, PbChip, PbChips, PbDatepicker,
    PbDialog, PbDivider, PbExpansionPanel, PbGridList, PbGridTile, PbIcon, PbInput, PbList, PbListItem,
    PbMenu, PbMenuItem, PbOption, PbPaginator, PbPrefix, PbProgressBar, PbProgressSpinner, PbRadioButton,
    PbRadioGroup, PbRipple, PbSelect, PbSlider, PbSlideToggle, PbSnackbar, PbStep, PbStepper, PbStepperNext,
    PbStepperPrevious, PbTab, PbTable, PbTabs, PbTimepicker, PbToolbar, PbTooltip, PbTree,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <pb-toolbar>
      <span>PB Design System · Angular</span>
      <span style="flex: 1"></span>
      <pb-button-toggle-group [value]="themes.theme()" (valueChange)="setTheme($event)" hideSingleSelectionIndicator>
        @for (theme of themeIds; track theme) {
          <pb-button-toggle [value]="theme">{{ theme }}</pb-button-toggle>
        }
      </pb-button-toggle-group>
    </pb-toolbar>

    <main class="showcase">
      <section id="buttons">
        <h2>Button</h2>
        <div class="row">
          <pb-button>Text</pb-button>
          <pb-button variant="filled">Filled</pb-button>
          <pb-button variant="tonal">Tonal</pb-button>
          <pb-button variant="outlined">Outlined</pb-button>
          <pb-button variant="elevated">Elevated</pb-button>
          <pb-button variant="filled" iconStart="add">Icon start</pb-button>
          <pb-button variant="filled" disabled>Disabled</pb-button>
          <pb-button variant="filled" [showProgress]="saving()" (click)="saving.set(!saving())">Save</pb-button>
          <pb-button variant="icon" icon="favorite" aria-label="Favorite" pbTooltip="Favorite" />
          <pb-button variant="fab" icon="edit" aria-label="Edit" />
          <pb-button variant="mini-fab" icon="add" aria-label="Add" />
          <pb-button variant="extended-fab" icon="navigation">Extended</pb-button>
          <pb-button variant="outlined" href="https://material.angular.dev">Link</pb-button>
        </div>
      </section>

      <section id="button-toggle">
        <h2>Button toggle</h2>
        <div class="row">
          <pb-button-toggle-group [(value)]="align">
            <pb-button-toggle value="left">Left</pb-button-toggle>
            <pb-button-toggle value="center">Center</pb-button-toggle>
            <pb-button-toggle value="right">Right</pb-button-toggle>
          </pb-button-toggle-group>
          <pb-button-toggle-group multiple [(values)]="styles">
            <pb-button-toggle value="bold">Bold</pb-button-toggle>
            <pb-button-toggle value="italic">Italic</pb-button-toggle>
            <pb-button-toggle value="underline">Underline</pb-button-toggle>
          </pb-button-toggle-group>
          <span id="toggle-state">{{ align() }} / {{ styles().join(', ') }}</span>
        </div>
      </section>

      <section id="badge-icon">
        <h2>Badge, icon, tooltip, ripple</h2>
        <div class="row">
          <pb-icon pbBadge="4">mail</pb-icon>
          <pb-icon pbBadge="12" pbBadgeSize="large">notifications</pb-icon>
          <pb-icon fontSet="symbols" color="primary">settings</pb-icon>
          <pb-icon color="error">error</pb-icon>
          <div pbRipple style="position: relative; overflow: hidden; padding: 16px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px">
            Click for ripple
          </div>
        </div>
      </section>

      <section id="card">
        <h2>Card</h2>
        <div class="row">
          @for (variant of cardVariants; track variant) {
            <pb-card [variant]="variant" style="width: 280px">
              <pb-card-header [title]="variant" subtitle="Card subtitle" />
              <pb-card-content>A {{ variant }} card with actions.</pb-card-content>
              <pb-card-actions align="end"><pb-button>Action</pb-button></pb-card-actions>
            </pb-card>
          }
        </div>
      </section>

      <section id="selection">
        <h2>Checkbox, radio, slide toggle, slider</h2>
        <div class="stack">
          <div class="row">
            <pb-checkbox [(checked)]="agree">I agree</pb-checkbox>
            <pb-checkbox [indeterminate]="true">Indeterminate</pb-checkbox>
            <pb-slide-toggle [(checked)]="wifi">Wi-Fi</pb-slide-toggle>
            <span id="selection-state">agree={{ agree() }} wifi={{ wifi() }}</span>
          </div>
          <pb-radio-group [(value)]="season">
            <pb-radio-button value="winter">Winter</pb-radio-button>
            <pb-radio-button value="spring">Spring</pb-radio-button>
            <pb-radio-button value="summer">Summer</pb-radio-button>
          </pb-radio-group>
          <pb-slider [(value)]="volume" discrete style="max-width: 320px" />
          <span id="slider-state">season={{ season() }} volume={{ volume() }}</span>
        </div>
      </section>

      <section id="fields">
        <h2>Input, select, autocomplete, datepicker, timepicker</h2>
        <div class="row">
          <pb-input label="Email" type="email" [(ngModel)]="email" supportingText="Two-way bound with ngModel">
            <pb-icon pbPrefix>mail</pb-icon>
          </pb-input>
          <pb-input label="Name" appearance="outline" errorText="Name is required" />
          <pb-select label="Fruit" [(value)]="fruit">
            <pb-option value="apple">Apple</pb-option>
            <pb-option value="banana">Banana</pb-option>
            <pb-option value="cherry" disabled>Cherry</pb-option>
          </pb-select>
          <pb-autocomplete label="State" [(value)]="state">
            @for (name of states; track name) {
              <pb-option [value]="name">{{ name }}</pb-option>
            }
          </pb-autocomplete>
          <pb-datepicker label="Date" [(value)]="date" />
          <pb-timepicker label="Time" [(value)]="time" />
          <span id="field-state">email={{ email }} fruit={{ fruit() }} state={{ state() }}</span>
        </div>
      </section>

      <section id="chips">
        <h2>Chips</h2>
        <pb-chips>
          <pb-chip icon="event">Assist</pb-chip>
          <pb-chip variant="filter" [(selected)]="filterOn">Filter</pb-chip>
          @for (tag of tags(); track tag) {
            <pb-chip variant="input" (removed)="removeTag(tag)">{{ tag }}</pb-chip>
          }
        </pb-chips>
      </section>

      <section id="expansion">
        <h2>Expansion panel</h2>
        <pb-accordion>
          <pb-expansion-panel title="Personal data" description="Type your name and age" [(expanded)]="panelOpen">
            Panel content.
          </pb-expansion-panel>
          <pb-expansion-panel title="Self aware panel" hasActions>
            Second panel.
            <pb-button pbPanelActions>Next</pb-button>
          </pb-expansion-panel>
        </pb-accordion>
      </section>

      <section id="list">
        <h2>List, divider, grid list</h2>
        <pb-list>
          <pb-list-item title="Inbox" subtitle="3 new messages" icon="inbox" meta="3" />
          <pb-list-item title="Starred" icon="star" (clicked)="clicks.set(clicks() + 1)" />
        </pb-list>
        <pb-divider />
        <pb-grid-list [cols]="4" rowHeight="80px" gutter="8px">
          <pb-grid-tile [colspan]="2"><div class="tile">1</div></pb-grid-tile>
          <pb-grid-tile><div class="tile">2</div></pb-grid-tile>
          <pb-grid-tile><div class="tile">3</div></pb-grid-tile>
        </pb-grid-list>
      </section>

      <section id="menu">
        <h2>Menu</h2>
        <div class="row">
          <pb-menu triggerLabel="Open menu" triggerVariant="outlined" [(isOpen)]="menuOpen">
            <pb-menu-item icon="edit" (selected)="lastAction.set('edit')">Edit</pb-menu-item>
            <pb-menu-item icon="delete" (selected)="lastAction.set('delete')">Delete</pb-menu-item>
            <pb-menu-item disabled>Disabled</pb-menu-item>
          </pb-menu>
          <pb-menu triggerVariant="icon" triggerIcon="more_vert" aria-label="More">
            <pb-menu-item>Settings</pb-menu-item>
          </pb-menu>
          <span id="menu-state">last={{ lastAction() }}</span>
        </div>
      </section>

      <section id="tabs">
        <h2>Tabs and stepper</h2>
        <pb-tabs [(selectedIndex)]="tab">
          <pb-tab label="First">First tab content</pb-tab>
          <pb-tab label="Second">Second tab content</pb-tab>
          <pb-tab label="Disabled" disabled>Never shown</pb-tab>
        </pb-tabs>
        <pb-stepper>
          <pb-step label="Fill out your name">
            <pb-button variant="filled" pbStepperNext>Next</pb-button>
          </pb-step>
          <pb-step label="Done">
            You are now done.
            <pb-button pbStepperPrevious>Back</pb-button>
          </pb-step>
        </pb-stepper>
      </section>

      <section id="table">
        <h2>Table, sort header, paginator</h2>
        <pb-table [data]="elements" [columns]="columns">
          <ng-template pbCell="symbol" let-row><strong>{{ row.symbol }}</strong></ng-template>
        </pb-table>
        <pb-paginator [length]="100" [(pageIndex)]="page" showFirstLastButtons />
      </section>

      <section id="tree">
        <h2>Tree</h2>
        <pb-tree [nodes]="tree" />
      </section>

      <section id="progress">
        <h2>Progress</h2>
        <div class="stack">
          <pb-progress-bar [value]="40" />
          <pb-progress-bar indeterminate />
          <div class="row">
            <pb-progress-spinner [value]="70" />
            <pb-progress-spinner [diameter]="32" />
          </div>
        </div>
      </section>

      <section id="overlays">
        <h2>Dialog, snackbar, bottom sheet</h2>
        <div class="row">
          <pb-button variant="filled" (click)="dialogOpen.set(true)">Open dialog</pb-button>
          <pb-button variant="tonal" (click)="snackOpen.set(true)">Show snackbar</pb-button>
          <pb-button variant="outlined" (click)="sheetOpen.set(true)">Open bottom sheet</pb-button>
        </div>
        <pb-dialog [(open)]="dialogOpen" title="Delete file?">
          This cannot be undone.
          <ng-container pbDialogActions>
            <pb-button (click)="dialogOpen.set(false)">Cancel</pb-button>
            <pb-button variant="filled" (click)="dialogOpen.set(false)">Delete</pb-button>
          </ng-container>
        </pb-dialog>
        <pb-snackbar [(open)]="snackOpen" actionLabel="Undo">Message archived</pb-snackbar>
        <pb-bottom-sheet [(open)]="sheetOpen">
          <pb-list>
            <pb-list-item title="Google Keep" subtitle="Add to a note" icon="note" (clicked)="sheetOpen.set(false)" />
            <pb-list-item title="Google Docs" subtitle="Embed in a document" icon="description" />
          </pb-list>
        </pb-bottom-sheet>
      </section>
    </main>
  `,
})
export class App {
  protected readonly themes = inject(PbThemeService);
  protected readonly themeIds = PB_THEMES;
  protected readonly cardVariants = ['elevated', 'filled', 'outlined'] as const;

  protected readonly saving = signal(false);
  protected readonly align = signal<string | null>('left');
  protected readonly styles = signal<readonly string[]>(['bold']);
  protected readonly agree = signal(false);
  protected readonly wifi = signal(true);
  protected readonly season = signal<unknown>('spring');
  protected readonly volume = signal(40);
  protected email = '';
  protected readonly fruit = signal<unknown>(null);
  protected readonly state = signal('');
  protected readonly states = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado'];
  protected readonly date = signal<Date | null>(null);
  protected readonly time = signal<Date | null>(null);
  protected readonly filterOn = signal(false);
  protected readonly tags = signal(['angular', 'blazor', 'tokens']);
  protected readonly panelOpen = signal(true);
  protected readonly clicks = signal(0);
  protected readonly menuOpen = signal(false);
  protected readonly lastAction = signal('none');
  protected readonly tab = signal(0);
  protected readonly page = signal(0);
  protected readonly dialogOpen = signal(false);
  protected readonly snackOpen = signal(false);
  protected readonly sheetOpen = signal(false);

  protected readonly columns: PbTableColumn[] = [
    { key: 'position', header: 'No.', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'weight', header: 'Weight', sortable: true },
    { key: 'symbol', header: 'Symbol' },
  ];
  protected readonly elements: Element[] = [
    { position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H' },
    { position: 2, name: 'Helium', weight: 4.0026, symbol: 'He' },
    { position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li' },
    { position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be' },
  ];
  protected readonly tree: PbTreeNode[] = [
    { label: 'Fruit', icon: 'folder', children: [{ label: 'Apple' }, { label: 'Banana' }] },
    { label: 'Vegetables', icon: 'folder', children: [{ label: 'Green', children: [{ label: 'Broccoli' }] }] },
  ];

  protected setTheme(theme: string | null): void {
    if (theme) this.themes.set(theme as PbTheme);
  }

  protected removeTag(tag: string): void {
    this.tags.update((tags) => tags.filter((t) => t !== tag));
  }
}
