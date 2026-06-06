import { Injectable, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map, shareReplay } from 'rxjs';
import { CsvParserService } from './csv-parser.service';
import { ThresholdService } from './threshold.service';
import { SensorReading } from '../models/sensor-reading.model';
import { DeviceStatus, AlertItem, FilterState } from '../models/device-status.model';
import { AlertSeverity } from '../models/device-type.enum';

@Injectable({ providedIn: 'root' })
export class SensorDataService {
  private allReadingsSubject = new BehaviorSubject<SensorReading[]>([]);
  private allReadings$ = this.allReadingsSubject.asObservable();

  private selectedDeviceIdSubject = new BehaviorSubject<string | null>(null);
  selectedDeviceId$ = this.selectedDeviceIdSubject.asObservable();

  private filterSubject = new BehaviorSubject<FilterState>({
    reparto: 'Tutti',
    status: 'Tutti',
    deviceType: 'Tutti',
  });
  filter$ = this.filterSubject.asObservable();

  devices$: Observable<DeviceStatus[]>;
  alerts$: Observable<AlertItem[]>;
  filteredDevices$: Observable<DeviceStatus[]>;
  selectedDevice$: Observable<DeviceStatus | null>;

  constructor(
    private csvParser: CsvParserService,
    private thresholdService: ThresholdService
  ) {
    this.devices$ = this.allReadings$.pipe(
      map((readings) => this.buildDeviceStatuses(readings)),
      shareReplay(1)
    );

    this.alerts$ = this.devices$.pipe(
      map((devices) => {
        const alerts: AlertItem[] = [];
        devices.forEach((d) => alerts.push(...d.activeAlerts));
        alerts.sort((a, b) => {
          const rank: Record<AlertSeverity, number> = { OK: 0, WARNING: 1, CRITICAL: 2 };
          return rank[b.severity] - rank[a.severity];
        });
        return alerts;
      }),
      shareReplay(1)
    );

    this.filteredDevices$ = combineLatest([this.devices$, this.filter$]).pipe(
      map(([devices, filter]) => this.applyFilter(devices, filter)),
      shareReplay(1)
    );

    this.selectedDevice$ = combineLatest([this.devices$, this.selectedDeviceId$]).pipe(
      map(([devices, id]) => {
        if (!id) return null;
        return devices.find((d) => d.deviceId === id) || null;
      }),
      shareReplay(1)
    );
  }

  loadData(path: string): void {
    this.csvParser.loadCSV(path).subscribe((readings) => {
      this.allReadingsSubject.next(readings);
    });
  }

  selectDevice(deviceId: string | null): void {
    this.selectedDeviceIdSubject.next(deviceId);
  }

  setFilter(filter: Partial<FilterState>): void {
    this.filterSubject.next({ ...this.filterSubject.value, ...filter });
  }

  getAllReadings(): Observable<SensorReading[]> {
    return this.allReadings$;
  }

  private buildDeviceStatuses(readings: SensorReading[]): DeviceStatus[] {
    const byDevice = new Map<string, SensorReading[]>();
    readings.forEach((r) => {
      const existing = byDevice.get(r.deviceId) || [];
      existing.push(r);
      byDevice.set(r.deviceId, existing);
    });

    const statuses: DeviceStatus[] = [];
    byDevice.forEach((history, deviceId) => {
      const sorted = [...history].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
      const latest = sorted[0];
      const severity = this.thresholdService.computeSeverity(latest);
      const activeAlerts = this.thresholdService.getAlerts(latest);

      statuses.push({
        deviceId,
        deviceType: latest.deviceType,
        reparto: latest.reparto,
        latestReading: latest,
        computedSeverity: severity,
        activeAlerts,
        history: sorted,
      });
    });

    return statuses.sort((a, b) => a.deviceId.localeCompare(b.deviceId));
  }

  private applyFilter(
    devices: DeviceStatus[],
    filter: FilterState
  ): DeviceStatus[] {
    return devices.filter((d) => {
      if (filter.reparto !== 'Tutti' && d.reparto !== filter.reparto) return false;
      if (filter.status !== 'Tutti' && d.computedSeverity !== filter.status) return false;
      if (filter.deviceType !== 'Tutti' && d.deviceType !== filter.deviceType) return false;
      return true;
    });
  }
}
