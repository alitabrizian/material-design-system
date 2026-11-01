import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  model,
  output,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { PbLayerOrder } from '../core/layer-order';

/**
 * Material 3 bottom sheet (PBBottomSheet) that slides up from the bottom of the screen over a scrim;
 * shown through [(open)], the content is the sheet.
 */
@Component({
  selector: 'pb-bottom-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bottom-sheet.html',
})
export class PbBottomSheet {
  readonly open = model(false);
  readonly dismissed = output<void>();

  private readonly sheet = viewChild.required<TemplateRef<unknown>>('sheet');
  private readonly bottomSheet = inject(MatBottomSheet);
  private ref: MatBottomSheetRef<unknown> | null = null;

  constructor() {
    // Keeps this overlay in the Figma Layering order in the top layer.
    inject(PbLayerOrder);
    effect(() => {
      const open = this.open();
      untracked(() => (open ? this.show() : this.ref?.dismiss()));
    });
    inject(DestroyRef).onDestroy(() => this.ref?.dismiss());
  }

  private show(): void {
    if (this.ref) return;
    this.ref = this.bottomSheet.open(this.sheet(), { panelClass: 'pb-layer--modal' });
    this.ref.afterDismissed().subscribe(() => {
      this.ref = null;
      this.open.set(false);
      this.dismissed.emit();
    });
  }
}
