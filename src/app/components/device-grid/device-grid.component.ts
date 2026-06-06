import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceStatus } from '../../core/models/device-status.model';
import { DeviceCardComponent } from '../device-card/device-card.component';
import { LucideAngularModule, LayoutGrid } from 'lucide-angular';

@Component({
  selector: 'app-device-grid',
  standalone: true,
  imports: [CommonModule, DeviceCardComponent, LucideAngularModule],
  templateUrl: './device-grid.component.html',
})
export class DeviceGridComponent {
  @Input() devices: DeviceStatus[] = [];
  @Output() deviceSelected = new EventEmitter<string>();

  onDeviceSelected(deviceId: string): void {
    this.deviceSelected.emit(deviceId);
  }
}
