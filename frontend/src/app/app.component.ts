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
  alertItems: AlertItem[] = [];
  showAlerts = false;

  constructor(private readonly api: MonitoringApiService) {}

  ngOnInit(): void {
    this.api.getKpis().subscribe((kpis) => (this.kpis = kpis));
    this.loadAlerts();
  }

  loadDashboard(): void {
    this.api.getKpis().subscribe((kpis) => (this.kpis = kpis));
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.api.getReadings(undefined, 500).subscribe((rows) => {
      const alertMap = new Map<string, AlertItem>();

      for (const row of rows) {
        const status = row.stato_dispositivo.toUpperCase();
        if (status !== 'CRITICAL' && status !== 'WARNING') continue;

        const params = this.getAlertParameters(row, status);
        for (const p of params) {
          const key = `${row.device_id}|${p.parameter}|${p.severity}`;
          if (!alertMap.has(key)) {
            alertMap.set(key, {
              deviceId: row.device_id,
              severity: p.severity,
              parameter: p.parameter,
              value: p.value,
              timestamp: row.timestamp,
            });
          }
        }
      }

      this.api.getDevices().subscribe((devices) => {
        this.mergeDeviceAlerts(devices, alertMap);

        const sorted = Array.from(alertMap.values()).sort((a, b) => {
          const rank: Record<string, number> = { CRITICAL: 2, WARNING: 1 };
          const diff = (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0);
          if (diff !== 0) return diff;
          return b.timestamp.localeCompare(a.timestamp);
        });

        this.alertItems = sorted.slice(0, 20);
      });
    });
  }

  private mergeDeviceAlerts(devices: DeviceSummary[], alertMap: Map<string, AlertItem>): void {
    for (const device of devices) {
      if (device.critical_count > 0) {
        const key = `${device.device_id}|Stato|CRITICAL`;
        if (!alertMap.has(key)) {
          alertMap.set(key, {
            deviceId: device.device_id,
            severity: 'CRITICAL',
            parameter: 'Stato Generale',
            value: `${device.critical_count} critici`,
            timestamp: device.last_seen ?? new Date().toISOString(),
          });
        }
      }
      if (device.warning_count > 0) {
        const key = `${device.device_id}|Stato|WARNING`;
        if (!alertMap.has(key)) {
          alertMap.set(key, {
            deviceId: device.device_id,
            severity: 'WARNING',
            parameter: 'Stato Generale',
            value: `${device.warning_count} warning`,
            timestamp: device.last_seen ?? new Date().toISOString(),
          });
        }
      }
    }
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
