import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertItem } from '../../core/models/device-status.model';
import { AlertSeverity } from '../../core/models/device-type.enum';
import { LucideAngularModule, AlertTriangle, CheckCircle } from 'lucide-angular';

@Component({
  selector: 'app-alert-feed',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './alert-feed.component.html',
})
export class AlertFeedComponent {
  @Input() alerts: AlertItem[] = [];

  alertRowClass(severity: AlertSeverity): string {
    return severity === 'CRITICAL' ? 'bg-red-900/20' : severity === 'WARNING' ? 'bg-yellow-900/20' : '';
  }

  alertDotClass(severity: AlertSeverity): string {
    return severity === 'CRITICAL' ? 'bg-red-400' : 'bg-yellow-400';
  }

  alertBadgeClass(severity: AlertSeverity): string {
    return severity === 'CRITICAL' ? 'bg-red-600/50 text-red-300' : 'bg-yellow-600/50 text-yellow-300';
  }
}
