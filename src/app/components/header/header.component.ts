import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertSeverity } from '../../core/models/device-type.enum';
import { LucideAngularModule, ShieldCheck, Clock } from 'lucide-angular';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() systemStatus: AlertSeverity = 'OK';

  currentTime = new Date();
  private timer: any = null;

  get statusBgClass(): string {
    switch (this.systemStatus) {
      case 'CRITICAL': return 'bg-red-600/20';
      case 'WARNING': return 'bg-yellow-600/20';
      default: return 'bg-green-600/20';
    }
  }

  get statusDotClass(): string {
    switch (this.systemStatus) {
      case 'CRITICAL': return 'bg-red-400';
      case 'WARNING': return 'bg-yellow-400';
      default: return 'bg-green-400';
    }
  }

  get statusTextClass(): string {
    switch (this.systemStatus) {
      case 'CRITICAL': return 'text-red-400';
      case 'WARNING': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  }

  ngOnInit(): void {
    this.timer = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
