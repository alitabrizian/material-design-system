import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  Directive,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator, MatPaginatorIntl, PageEvent } from '@angular/material/paginator';
import { MatStep, MatStepLabel, MatStepper } from '@angular/material/stepper';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { PB_CONTENT_TEMPLATE, PbContentTemplate } from '../core/content-template';

// ------------------------------------------------------------------------------------------ tabs

/** One tab of a pb-tabs (PBTab). The content is the tab's body. */
@Component({
  selector: 'pb-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PB_CONTENT_TEMPLATE,
})
export class PbTab extends PbContentTemplate {
  readonly label = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
}

export type PbTabsAlign = 'start' | 'center' | 'end';

/** Material 3 primary tabs (PBTabs) of pb-tab children. */
@Component({
  selector: 'pb-tabs',
  imports: [MatTabGroup, MatTab, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `
    <mat-tab-group [(selectedIndex)]="selectedIndex" [mat-stretch-tabs]="stretch()" [mat-align-tabs]="align()">
      @for (tab of tabs(); track tab) {
        <mat-tab [label]="tab.label()" [disabled]="tab.disabled()">
          <ng-container [ngTemplateOutlet]="tab.template()" />
        </mat-tab>
      }
    </mat-tab-group>
  `,
})
export class PbTabs {
  readonly selectedIndex = model(0);
  /** Stretches the tabs across the full width of the header. */
  readonly stretch = input(true, { transform: booleanAttribute });
  readonly align = input<PbTabsAlign>('start');

  protected readonly tabs = contentChildren(PbTab);
}

// --------------------------------------------------------------------------------------- stepper

/** One step of a pb-stepper (PBStep). The content is the step's body. */
@Component({
  selector: 'pb-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PB_CONTENT_TEMPLATE,
})
export class PbStep extends PbContentTemplate {
  readonly label = input.required<string>();
  readonly optional = input(false, { transform: booleanAttribute });
  readonly editable = input(true, { transform: booleanAttribute });
}

export type PbStepperOrientation = 'horizontal' | 'vertical';

/**
 * Material 3 stepper (PBStepper) of pb-step children. Buttons inside a step move between steps with
 * pbStepperNext / pbStepperPrevious.
 */
@Component({
  selector: 'pb-stepper',
  imports: [MatStepper, MatStep, MatStepLabel, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `
    <mat-stepper [orientation]="orientation()" [linear]="linear()" [(selectedIndex)]="selectedIndex">
      @for (step of steps(); track step) {
        <mat-step [optional]="step.optional()" [editable]="step.editable()">
          <ng-template matStepLabel>{{ step.label() }}</ng-template>
          <ng-container [ngTemplateOutlet]="step.template()" />
        </mat-step>
      }
    </mat-stepper>
  `,
})
export class PbStepper {
  readonly orientation = input<PbStepperOrientation>('horizontal');
  readonly linear = input(false, { transform: booleanAttribute });
  readonly selectedIndex = model(0);

  protected readonly steps = contentChildren(PbStep);

  next(): void {
    this.selectedIndex.update((index) => Math.min(index + 1, this.steps().length - 1));
  }

  previous(): void {
    this.selectedIndex.update((index) => Math.max(index - 1, 0));
  }
}

/** Moves the enclosing pb-stepper to the next step on click. */
@Directive({
  selector: '[pbStepperNext]',
  host: { '(click)': 'stepper.next()' },
})
export class PbStepperNext {
  protected readonly stepper = inject(PbStepper);
}

/** Moves the enclosing pb-stepper to the previous step on click. */
@Directive({
  selector: '[pbStepperPrevious]',
  host: { '(click)': 'stepper.previous()' },
})
export class PbStepperPrevious {
  protected readonly stepper = inject(PbStepper);
}

// ------------------------------------------------------------------------------------------ menu

/** One item of a pb-menu (PBMenuItem). The content is the item's label. */
@Component({
  selector: 'pb-menu-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PB_CONTENT_TEMPLATE,
})
export class PbMenuItem extends PbContentTemplate {
  readonly icon = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly selected = output<void>();
}

export type PbMenuXPosition = 'before' | 'after';
export type PbMenuYPosition = 'above' | 'below';
export type PbMenuTriggerVariant = 'text' | 'filled' | 'tonal' | 'outlined' | 'elevated' | 'icon';

/**
 * Material 3 menu (PBMenu) opened from its own trigger button.
 *
 *   <pb-menu triggerVariant="icon" triggerIcon="more_vert" aria-label="More">
 *     <pb-menu-item icon="edit" (selected)="edit()">Edit</pb-menu-item>
 *   </pb-menu>
 */
@Component({
  selector: 'pb-menu',
  imports: [MatMenu, MatMenuItem, MatMenuTrigger, MatButton, MatIconButton, MatIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: inline-block; }',
  template: `
    @if (triggerVariant() === 'icon') {
      <button matIconButton [matMenuTriggerFor]="menu" [attr.aria-label]="ariaLabel()"
              (menuOpened)="isOpen.set(true)" (menuClosed)="isOpen.set(false)">
        <mat-icon>{{ triggerIcon() ?? 'more_vert' }}</mat-icon>
      </button>
    } @else {
      <button [matButton]="triggerAppearance()" [matMenuTriggerFor]="menu"
              (menuOpened)="isOpen.set(true)" (menuClosed)="isOpen.set(false)">
        @if (triggerIcon(); as name) { <mat-icon>{{ name }}</mat-icon> }
        {{ triggerLabel() }}
      </button>
    }
    <mat-menu #menu="matMenu" [xPosition]="xPosition()" [yPosition]="yPosition()" [class]="panelClass()">
      @for (item of items(); track item) {
        <button mat-menu-item [disabled]="item.disabled()" (click)="item.selected.emit()">
          @if (item.icon(); as name) { <mat-icon>{{ name }}</mat-icon> }
          <span><ng-container [ngTemplateOutlet]="item.template()" /></span>
        </button>
      }
    </mat-menu>
  `,
})
export class PbMenu {
  readonly triggerVariant = input<PbMenuTriggerVariant>('text');
  readonly triggerLabel = input('');
  readonly triggerIcon = input<string>();
  readonly xPosition = input<PbMenuXPosition>('after');
  readonly yPosition = input<PbMenuYPosition>('below');
  readonly panelClass = input('');
  readonly ariaLabel = input<string>(undefined, { alias: 'aria-label' });
  /** Whether the menu is open (read-only: open it by clicking the trigger). */
  readonly isOpen = model(false);

  protected readonly items = contentChildren(PbMenuItem);

  protected triggerAppearance(): 'text' | 'filled' | 'tonal' | 'outlined' | 'elevated' {
    const variant = this.triggerVariant();
    return variant === 'icon' ? 'text' : variant;
  }
}

// ------------------------------------------------------------------------------------- paginator

/** Emitted by pb-paginator when the page or page size changes (PBPageEvent). */
export type PbPageEvent = PageEvent;

/**
 * Material 3 paginator (PBPaginator). The labels default to Angular Material's English ones.
 */
@Component({
  selector: 'pb-paginator',
  imports: [MatPaginator],
  providers: [{ provide: MatPaginatorIntl, useFactory: () => new MatPaginatorIntl() }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `
    <mat-paginator
      [length]="length()"
      [pageIndex]="pageIndex()"
      [pageSize]="pageSize()"
      [pageSizeOptions]="pageSizeOptions()"
      [showFirstLastButtons]="showFirstLastButtons()"
      [hidePageSize]="hidePageSize()"
      [disabled]="disabled()"
      (page)="onPage($event)"
    />
  `,
})
export class PbPaginator {
  readonly length = input(0);
  readonly pageIndex = model(0);
  readonly pageSize = model(10);
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 25, 100]);
  readonly showFirstLastButtons = input(false, { transform: booleanAttribute });
  readonly hidePageSize = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly itemsPerPageLabel = input('Items per page:');
  readonly firstPageLabel = input('First page');
  readonly previousPageLabel = input('Previous page');
  readonly nextPageLabel = input('Next page');
  readonly lastPageLabel = input('Last page');
  readonly page = output<PbPageEvent>();

  private readonly intl = inject(MatPaginatorIntl);

  constructor() {
    effect(() => {
      this.intl.itemsPerPageLabel = this.itemsPerPageLabel();
      this.intl.firstPageLabel = this.firstPageLabel();
      this.intl.previousPageLabel = this.previousPageLabel();
      this.intl.nextPageLabel = this.nextPageLabel();
      this.intl.lastPageLabel = this.lastPageLabel();
      this.intl.changes.next();
    });
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.page.emit(event);
  }
}
