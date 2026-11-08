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
import { PbLayerOrder } from '../core/layer-order';
import { playExit } from '../core/motion';

/** Material 3 snackbar (PBSnackbar) shown through [(open)]; the content is the message. Placed, opened and closed as the Figma Motion page specifies. */
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
    // Keeps this overlay in the Figma Layering order in the top layer.
    inject(PbLayerOrder);
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
    // Figma Motion: always 40px from the top and right edges (in RTL too), moving in downwards
    // (styles/material-motion.css).
    this.ref = this.snackBar.openFromTemplate(this.message(), {
      ...(duration > 0 ? { duration } : {}),
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['pb-snackbar-panel', 'pb-layer--snackbar'],
    });
    // Figma Motion: it closes with the move in reversed (500ms, back up out of the screen). MatSnackBar
    // gives an exit animation 200ms at most, so the container's exit waits for this one first. Its
    // callers don't subscribe to exit(); they wait for _onExit, which the real exit completes.
    const container = this.ref.containerInstance;
    const exit = container.exit.bind(container);
    container.exit = () => {
      void playExit(document.querySelector('.pb-snackbar-panel'), 'pb-snackbar-panel--closing').then(() => exit());
      return container._onExit;
    };
    this.ref.afterDismissed().subscribe(() => {
      this.ref = null;
      this.open.set(false);
    });
  }
}
