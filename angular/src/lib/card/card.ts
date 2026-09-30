import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  MatCard,
  MatCardActions,
  MatCardAppearance,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';

export type PbCardVariant = 'elevated' | 'filled' | 'outlined';
export type PbCardActionsAlign = 'start' | 'end';

/**
 * Material 3 card (PBCard). Compose with pb-card-header, pb-card-content and pb-card-actions, or any
 * content (images, lists).
 */
@Component({
  selector: 'pb-card',
  imports: [MatCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `<mat-card [appearance]="appearance()"><ng-content /></mat-card>`,
})
export class PbCard {
  readonly variant = input<PbCardVariant>('elevated');

  protected readonly appearance = computed<MatCardAppearance>(() => {
    const variant = this.variant();
    return variant === 'elevated' ? 'raised' : variant;
  });
}

/** Card header: title, optional subtitle, and an optional [pbCardAvatar] element. */
@Component({
  selector: 'pb-card-header',
  imports: [MatCardHeader, MatCardTitle, MatCardSubtitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `
    <mat-card-header>
      <ng-content select="[pbCardAvatar]" ngProjectAs="[mat-card-avatar]" />
      <mat-card-title>{{ title() }}</mat-card-title>
      @if (subtitle(); as text) {
        <mat-card-subtitle>{{ text }}</mat-card-subtitle>
      }
    </mat-card-header>
  `,
})
export class PbCardHeader {
  readonly title = input<string>();
  readonly subtitle = input<string>();
}

@Component({
  selector: 'pb-card-content',
  imports: [MatCardContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `<mat-card-content><ng-content /></mat-card-content>`,
})
export class PbCardContent {}

@Component({
  selector: 'pb-card-actions',
  imports: [MatCardActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: block; }',
  template: `<mat-card-actions [align]="align()"><ng-content /></mat-card-actions>`,
})
export class PbCardActions {
  readonly align = input<PbCardActionsAlign>('start');
}
