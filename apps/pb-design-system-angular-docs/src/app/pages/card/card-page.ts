import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  PbButton,
  PbCard,
  PbCardActions,
  PbCardAvatar,
  PbCardContent,
  PbCardHeader,
  PbIcon,
} from '@partobita/design-system-angular';
import { ExampleCard } from '../../shared/example-card/example-card';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'docs-card-page',
  imports: [PageHeader, ExampleCard, PbButton, PbCard, PbCardActions, PbCardAvatar, PbCardContent, PbCardHeader, PbIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card-page.html',
})
export class CardPage {}
