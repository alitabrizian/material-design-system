import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';

/**
 * Material 3 dialog (PBDialog) opened and closed through [(open)]. The content is the body;
 * [pbDialogActions] elements go in the action row.
 *
 *   <pb-dialog [(open)]="confirming" title="Delete file?">
 *     This cannot be undone.
 *     <ng-container pbDialogActions>
 *       <pb-button (click)="confirming.set(false)">Cancel</pb-button>
 *     </ng-container>
 *   </pb-dialog>
 */
@Component({
  selector: 'pb-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialog.html',
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
