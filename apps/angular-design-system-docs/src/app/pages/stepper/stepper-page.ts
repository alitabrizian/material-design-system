import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  PbButton,
  PbInput,
  PbStep,
  PbStepper,
  PbStepperNext,
  PbStepperPrevious,
  PbStepperReset,
} from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-stepper-page',
  imports: [PageHeader, ExampleCard, PbButton, PbInput, PbStep, PbStepper, PbStepperNext, PbStepperPrevious, PbStepperReset],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stepper-page.html',
})
export class StepperPage {}
