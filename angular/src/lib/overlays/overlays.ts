import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButton } from '@angular/material/button';
import { MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import {
  MatSnackBar,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef,
} from '@angular/material/snack-bar';

/**
 * Material 3 dialog (PBDialog) opened and closed through [(open)]. The content is the body;
 * [pbDialogActions] elements go in the action row.
 *
 *   <pb-dialog [(open)]="confirming" title="Delete file?">
 *     This cannot be undone.
 *     <ng-container pbDialogActions>
 *       <pb-button (click)="confirming = false">Cancel</pb-button>
 *     </ng-container>
 *   </pb-dialog>
 */
@Component({
  selector: 'pb-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #body>
      @if (title(); as text) {
        <h2 mat-dialog-title>{{ text }}</h2>
      }
      <mat-dialog-content><ng-content /></mat-dialog-content>
      <mat-dialog-actions align="end"><ng-content select="[pbDialogActions]" /></mat-dialog-actions>
    </ng-template>
  `,
})
export class PbDialog {
  readonly open = model(false);
  readonly title = input<string>();
  /** Keeps Escape and backdrop clicks from closing the dialog. */
  readonly disableClose = input(false, { transform: booleanAttribute });

  private readonly body = viewChild.required<TemplateRef<unknown>>('body');
  private readonly dialog = inject(MatDialog);
  private ref: MatDialogRef<unknown> | null = null;

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => (open ? this.show() : this.ref?.close()));
    });
    inject(DestroyRef).onDestroy(() => this.ref?.close());
  }

  private show(): void {
    if (this.ref) return;
    this.ref = this.dialog.open(this.body(), { disableClose: this.disableClose() });
    this.ref.afterClosed().subscribe(() => {
      this.ref = null;
      this.open.set(false);
    });
  }
}

/**
 * Material 3 snackbar (PBSnackbar) shown through [(open)]; the content is the message.
 */
@Component({
  selector: 'pb-snackbar',
  imports: [MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #message>
      <span matSnackBarLabel><ng-content /></span>
      @if (actionLabel(); as label) {
        <span matSnackBarActions>
          <button matButton matSnackBarAction (click)="runAction()">{{ label }}</button>
        </span>
      }
    </ng-template>
  `,
})
export class PbSnackbar {
  readonly open = model(false);
  /** Milliseconds before the snackbar hides itself; 0 keeps it until dismissed. */
  readonly duration = input(4000);
  readonly actionLabel = input<string>();
  readonly action = output<void>();

  private readonly message = viewChild.required<TemplateRef<unknown>>('message');
  private readonly snackBar = inject(MatSnackBar);
  private ref: MatSnackBarRef<unknown> | null = null;

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => (open ? this.show() : this.ref?.dismiss()));
    });
    inject(DestroyRef).onDestroy(() => this.ref?.dismiss());
  }

  protected runAction(): void {
    this.action.emit();
    this.ref?.dismissWithAction();
  }

  private show(): void {
    if (this.ref) return;
    const duration = this.duration();
    this.ref = this.snackBar.openFromTemplate(this.message(), duration > 0 ? { duration } : {});
    this.ref.afterDismissed().subscribe(() => {
      this.ref = null;
      this.open.set(false);
    });
  }
}

/**
 * Material 3 bottom sheet (PBBottomSheet) that slides up from the bottom of the screen over a scrim;
 * shown through [(open)], the content is the sheet.
 */
@Component({
  selector: 'pb-bottom-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-template #sheet><ng-content /></ng-template>`,
})
export class PbBottomSheet {
  readonly open = model(false);
  readonly dismissed = output<void>();

  private readonly sheet = viewChild.required<TemplateRef<unknown>>('sheet');
  private readonly bottomSheet = inject(MatBottomSheet);
  private ref: MatBottomSheetRef<unknown> | null = null;

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => (open ? this.show() : this.ref?.dismiss()));
    });
    inject(DestroyRef).onDestroy(() => this.ref?.dismiss());
  }

  private show(): void {
    if (this.ref) return;
    this.ref = this.bottomSheet.open(this.sheet());
    this.ref.afterDismissed().subscribe(() => {
      this.ref = null;
      this.open.set(false);
      this.dismissed.emit();
    });
  }
}
