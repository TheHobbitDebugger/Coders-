import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  templateUrl: './kpi-cards.component.html',
})
export class KpiCardsComponent {
  @Input() totalDevices = 0;
  @Input() criticalCount = 0;
  @Input() warningCount = 0;
  @Input() okCount = 0;
}
