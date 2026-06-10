import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceReading } from '../services/sensor-state.service';

@Component({
  selector: 'app-status-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      (click)="cardClick.emit(device().device_id)"
      class="p-4 rounded-xl shadow-sm border transition-all cursor-pointer hover:shadow-md"
      [ngClass]="{
        'bg-white border-gray-200': device().stato_dispositivo === 'OK',
        'bg-yellow-50 border-yellow-400': device().stato_dispositivo === 'WARNING',
        'bg-red-50 border-red-500 animate-pulse': device().stato_dispositivo === 'CRITICAL'
      }">
      
      <div class="flex justify-between items-start mb-2">
        <div>
          <h3 class="text-lg font-bold text-gray-800">{{ device().device_id }}</h3>
          <p class="text-xs text-gray-500 uppercase">{{ device().device_type }}</p>
        </div>
        <span class="px-2 py-1 text-xs font-bold rounded-full"
          [ngClass]="{
            'bg-green-100 text-green-800': device().stato_dispositivo === 'OK',
            'bg-yellow-200 text-yellow-800': device().stato_dispositivo === 'WARNING',
            'bg-red-200 text-red-800': device().stato_dispositivo === 'CRITICAL'
          }">
          {{ device().stato_dispositivo }}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-2 text-sm mt-4">
        <div class="flex flex-col">
          <span class="text-gray-500 text-xs">Temp</span>
          <span class="font-semibold">{{ device().temperatura | number:'1.1-2' }} °C</span>
        </div>
        <div class="flex flex-col">
          <span class="text-gray-500 text-xs">Vibrazione</span>
          <span class="font-semibold">{{ device().vibrazione | number:'1.2-3' }} mm/s</span>
        </div>
      </div>
    </div>
  `
})
export class StatusCardComponent {
  // Angular 19 Signal Input
  device = input.required<DeviceReading>();
  // Angular 19 Output
  cardClick = output<string>();
}