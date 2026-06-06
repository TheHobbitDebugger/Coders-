import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceStatus } from '../../core/models/device-status.model';
import { DeviceType } from '../../core/models/device-type.enum';
import { LucideAngularModule, Thermometer, Activity, Cylinder, Building2 } from 'lucide-angular';

@Component({
  selector: 'app-device-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './device-card.component.html',
})
export class DeviceCardComponent {
  @Input() device!: DeviceStatus;
  @Output() selected = new EventEmitter<string>();

  get statusClasses(): Record<string, boolean> {
    const s = this.device.computedSeverity;
    return {
      'border-green-700': s === 'OK',
      'bg-green-900/10': s === 'OK',
      'border-yellow-700': s === 'WARNING',
      'bg-yellow-900/10': s === 'WARNING',
      'border-red-700': s === 'CRITICAL',
      'bg-red-900/10': s === 'CRITICAL',
    };
  }

  get severityClasses(): Record<string, boolean> {
    const s = this.device.computedSeverity;
    return {
      'bg-green-600/30 text-green-300': s === 'OK',
      'bg-yellow-600/30 text-yellow-300': s === 'WARNING',
      'bg-red-600/30 text-red-300': s === 'CRITICAL',
    };
  }

  get deviceIcon(): string {
    const icons: Record<DeviceType, string> = {
      incubatore: 'thermometer',
      cella_coltura: 'activity',
      banca_criogenica: 'cylinder',
      hvac: 'building-2',
    };
    return icons[this.device.deviceType] ?? 'thermometer';
  }

  get typeLabel(): string {
    const labels: Record<DeviceType, string> = {
      incubatore: 'Incubatore',
      cella_coltura: 'Cella di Coltura',
      banca_criogenica: 'Banca Criogenica',
      hvac: 'HVAC',
    };
    return labels[this.device.deviceType] ?? this.device.deviceType;
  }

  onClick(): void {
    this.selected.emit(this.device.deviceId);
  }
}
