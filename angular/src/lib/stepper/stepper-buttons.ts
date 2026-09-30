import { Directive, inject } from '@angular/core';
import { PbStepper } from './stepper';

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

/** Returns the enclosing pb-stepper to its first step on click. */
@Directive({
  selector: '[pbStepperReset]',
  host: { '(click)': 'stepper.reset()' },
})
export class PbStepperReset {
  protected readonly stepper = inject(PbStepper);
}
