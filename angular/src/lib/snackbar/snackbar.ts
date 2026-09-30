import {
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
import { MatButton } from '@angular/material/button';
import {
  MatSnackBar,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef,
} from '@angular/material/snack-bar';

/** Material 3 snackbar (PBSnackbar) shown through [(open)]; the content is the message. */
@Component({
  selector: 'pb-snackbar',
  imports: [MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction, MatButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './snackbar.html',
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
