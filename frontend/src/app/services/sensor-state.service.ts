import { Injectable, signal, computed } from '@angular/core';

export interface DeviceReading {
  timestamp: string;
  device_id: string;
  device_type: string;
  reparto: string;
  temperatura: number;
  vibrazione: number;
  livello_azoto?: number;
  stato_dispositivo: 'OK' | 'WARNING' | 'CRITICAL';
}

@Injectable({ providedIn: 'root' })
export class SensorStateService {
  // Writable signal holding the latest reading for each device
  private devicesSignal = signal<DeviceReading[]>([]);
  
  // Writable signal for the Alert Log
  private alertLogSignal = signal<DeviceReading[]>([]);

  // Computed signals (derived state)
  public allDevices = this.devicesSignal.asReadonly();
  public alertLog = this.alertLogSignal.asReadonly();
  
  public criticalCount = computed(() => 
    this.devicesSignal().filter(d => d.stato_dispositivo === 'CRITICAL').length
  );

  // method to call when mqtt arrives
  public updateDeviceData(newData: DeviceReading[]) {
    this.devicesSignal.set(newData);
    
    // Auto-populate alert log
    const alerts = newData.filter(d => d.stato_dispositivo !== 'OK');
    this.alertLogSignal.update(current => [...alerts, ...current].slice(0, 50)); // Keep last 50
  }
}