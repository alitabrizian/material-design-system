import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, contentChildren, input, model } from '@angular/core';
import { MatStep, MatStepLabel, MatStepper } from '@angular/material/stepper';
import { PbStep } from './step';

export type PbStepperOrientation = 'horizontal' | 'vertical';

/**
 * Material 3 stepper (PBStepper) of pb-step children. Buttons inside a step move between steps with
 * pbStepperNext / pbStepperPrevious.
 */
@Component({
  selector: 'pb-stepper',
  imports: [MatStepper, MatStep, MatStepLabel, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stepper.html',
  styleUrl: '../core/block.css',
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

  reset(): void {
    this.selectedIndex.set(0);
  }
}
