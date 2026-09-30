import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbDatepicker } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-datepicker-page',
  imports: [PageHeader, ExampleCard, PbDatepicker, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './datepicker-page.html',
})
export class DatepickerPage {
  // #region default
  protected readonly date = signal<Date | null>(null);
  protected readonly today = new Date();
  // #endregion
}
