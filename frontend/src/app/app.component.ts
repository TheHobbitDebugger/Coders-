import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MonitoringApiService, Kpis, SensorReading, DeviceSummary } from './services/monitoring-api.service';

interface AlertItem {
  deviceId: string;
  severity: string;
  parameter: string;
  value: string;
  timestamp: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  kpis: Kpis | null = null;
  devices: DeviceSummary[] = [];
  readings: SensorReading[] = [];
  selectedDevice: string | null = null;
  selectedLab: string | null = null;
  selectedMetric = 'temperatura';
  selectedFrom = '';
  selectedTo = '';
  private chart?: Chart;

  constructor(private readonly api: MonitoringApiService) {}

  ngOnInit(): void {
    this.api.getKpis().subscribe((kpis) => (this.kpis = kpis));
    this.loadAlerts();
  }

  loadDashboard(): void {
    this.api.getKpis().subscribe((kpis) => (this.kpis = kpis));
    this.api.getDevices().subscribe((devices) => {
      this.devices = devices;
      if (!this.selectedDevice && devices.length > 0) {
        this.selectedDevice = devices[0].device_id;
      }
      this.loadChartAndReadings();
    });
  }

  get labs(): string[] {
    return [...new Set(this.devices.map((device) => device.laboratorio))].sort((a, b) => Number(a) - Number(b));
  }

  get filteredDevices(): DeviceSummary[] {
    if (!this.selectedLab) {
      return this.devices;
    }
    return this.devices.filter((device) => device.laboratorio === this.selectedLab);
  }

  onLabChange(): void {
    if (this.selectedDevice && !this.filteredDevices.some((device) => device.device_id === this.selectedDevice)) {
      this.selectedDevice = null;
    }
    this.loadChartAndReadings();
  }

  loadChartAndReadings(): void {
    this.api
      .getReadings(this.selectedDevice ?? undefined, 120, this.selectedFrom, this.selectedTo, this.selectedLab ?? undefined)
      .subscribe((rows) => (this.readings = rows));
    this.api
      .getTimeseries(this.selectedDevice, this.selectedMetric, 240, this.selectedFrom, this.selectedTo, this.selectedLab ?? undefined)
      .subscribe((points) => this.renderChart(points));
  }

  selectDevice(deviceId: string): void {
    this.selectedDevice = deviceId;
    this.loadChartAndReadings();
  }

  private getAlertParameters(row: SensorReading, status: string): { severity: string; parameter: string; value: string }[] {
    const results: { severity: string; parameter: string; value: string }[] = [];

    if (row.device_type === 'banca_criogenica') {
      if (row.temperatura !== null) {
        const sev = this.computeCryoTempSeverity(row.temperatura);
        if (sev !== 'OK') results.push({ severity: sev, parameter: 'Temperatura', value: row.temperatura.toFixed(1) + ' °C' });
      }
      if (row.vibrazione !== null) {
        const sev = this.computeCryoVibSeverity(row.vibrazione);
        if (sev !== 'OK') results.push({ severity: sev, parameter: 'Vibrazione', value: row.vibrazione.toFixed(3) + ' mm/s' });
      }
      if (row.livello_azoto !== null) {
        const sev = this.computeAzotoSeverity(row.livello_azoto);
        if (sev !== 'OK') results.push({ severity: sev, parameter: 'Livello Azoto', value: row.livello_azoto.toFixed(1) + ' %' });
      }
    } else if (row.device_type === 'hvac') {
      if (row.temperatura !== null) {
        const sev = this.computeHvacTempSeverity(row.temperatura);
        if (sev !== 'OK') results.push({ severity: sev, parameter: 'Temperatura', value: row.temperatura.toFixed(1) + ' °C' });
      }
      if (row.vibrazione !== null) {
        const sev = this.computeHvacVibSeverity(row.vibrazione);
        if (sev !== 'OK') results.push({ severity: sev, parameter: 'Vibrazione', value: row.vibrazione.toFixed(3) + ' mm/s' });
      }
    } else {
      const vibLimit = row.device_type === 'incubatore' ? 0.6 : 0.4;
      const vibWarn = row.device_type === 'incubatore' ? 1.0 : 0.8;
      if (row.temperatura !== null) {
        const sev = this.computeIncubatorTempSeverity(row.temperatura);
        if (sev !== 'OK') results.push({ severity: sev, parameter: 'Temperatura', value: row.temperatura.toFixed(1) + ' °C' });
      }
      if (row.vibrazione !== null) {
        const sev = this.computeVibSeverity(row.vibrazione, vibLimit, vibWarn);
        if (sev !== 'OK') results.push({ severity: sev, parameter: 'Vibrazione', value: row.vibrazione.toFixed(3) + ' mm/s' });
      }
    }

    if (results.length === 0 && status !== 'OK') {
      results.push({ severity: status, parameter: 'Stato Generale', value: status });
    }
    return results;
  }

  private computeIncubatorTempSeverity(temp: number): string {
    if (temp >= 36 && temp <= 38) return 'OK';
    if (temp >= 35 && temp <= 39) return 'WARNING';
    return 'CRITICAL';
  }

  private computeVibSeverity(vib: number, limit: number, warn: number): string {
    if (vib < limit) return 'OK';
    if (vib < warn) return 'WARNING';
    return 'CRITICAL';
  }

  private computeCryoTempSeverity(temp: number): string {
    if (temp <= -194) return 'OK';
    if (temp <= -192) return 'WARNING';
    return 'CRITICAL';
  }

  private computeCryoVibSeverity(vib: number): string {
    if (vib < 0.5) return 'OK';
    if (vib < 1.0) return 'WARNING';
    return 'CRITICAL';
  }

  private computeAzotoSeverity(azoto: number): string {
    if (azoto > 40) return 'OK';
    if (azoto >= 35) return 'WARNING';
    return 'CRITICAL';
  }

  private computeHvacTempSeverity(temp: number): string {
    if (temp >= 19 && temp <= 23) return 'OK';
    if (temp >= 18 && temp <= 25) return 'WARNING';
    return 'CRITICAL';
  }

  private computeHvacVibSeverity(vib: number): string {
    if (vib < 1.2) return 'OK';
    if (vib < 2.0) return 'WARNING';
    return 'CRITICAL';
  }

  get alertCount(): number {
    return this.alertItems.length;
  }

  formatTimestamp(isoStr: string): string {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${min}`;
  }

  toggleAlerts(event: Event): void {
    event.stopPropagation();
    this.showAlerts = !this.showAlerts;
  }

  @HostListener('document:click')
  onClickOutside(): void {
    this.showAlerts = false;
  }

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'critical';
      case 'WARNING': return 'warning';
      default: return 'ok';
    }
  }
}
