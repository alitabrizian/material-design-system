import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PbTimepicker } from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-timepicker-page',
  imports: [PageHeader, ExampleCard, PbTimepicker, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timepicker-page.html',
})
export class TimepickerPage {
  // #region default
  protected readonly time = signal<Date | null>(null);
  // #endregion
}
