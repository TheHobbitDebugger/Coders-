import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, map } from 'rxjs';
import { HeaderComponent } from './components/header/header.component';
import { FilterBarComponent } from './components/filter-bar/filter-bar.component';
import { KpiCardsComponent } from './components/kpi-cards/kpi-cards.component';
import { AlertFeedComponent } from './components/alert-feed/alert-feed.component';
import { DeviceGridComponent } from './components/device-grid/device-grid.component';
import { SensorChartComponent } from './components/sensor-chart/sensor-chart.component';
import { SensorDataService } from './core/services/sensor-data.service';
import { AlertSeverity } from './core/models/device-type.enum';
import { DeviceStatus, FilterState } from './core/models/device-status.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FilterBarComponent,
    KpiCardsComponent,
    AlertFeedComponent,
    DeviceGridComponent,
    SensorChartComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  devices$ = this.dataService.devices$;
  alerts$ = this.dataService.alerts$;
  filteredDevices$ = this.dataService.filteredDevices$;
  selectedDevice$ = this.dataService.selectedDevice$;
  filter$ = this.dataService.filter$;

  criticalCount$: Observable<number>;
  warningCount$: Observable<number>;
  okCount$: Observable<number>;
  overallStatus$: Observable<AlertSeverity>;

  constructor(private dataService: SensorDataService) {
    this.criticalCount$ = this.dataService.filteredDevices$.pipe(
      map((devices: DeviceStatus[]) => devices.filter((d) => d.computedSeverity === 'CRITICAL').length)
    );
    this.warningCount$ = this.dataService.filteredDevices$.pipe(
      map((devices: DeviceStatus[]) => devices.filter((d) => d.computedSeverity === 'WARNING').length)
    );
    this.okCount$ = this.dataService.filteredDevices$.pipe(
      map((devices: DeviceStatus[]) => devices.filter((d) => d.computedSeverity === 'OK').length)
    );
    this.overallStatus$ = this.dataService.devices$.pipe(
      map((devices: DeviceStatus[]) => {
        let worst: AlertSeverity = 'OK';
        const rank: Record<AlertSeverity, number> = { OK: 0, WARNING: 1, CRITICAL: 2 };
        devices.forEach((d) => {
          if (rank[d.computedSeverity] > rank[worst]) worst = d.computedSeverity;
        });
        return worst;
      })
    );
  }

  ngOnInit(): void {
    this.dataService.loadData('assets/data/sensors.csv');
  }

  onFilterChange(filter: Partial<FilterState>): void {
    this.dataService.setFilter(filter);
  }

  onDeviceSelect(deviceId: string): void {
    this.dataService.selectDevice(deviceId);
  }
}
