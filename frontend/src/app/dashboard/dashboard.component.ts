import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import Chart from 'chart.js/auto';
import { Subscription } from 'rxjs';
import {
  AnalyticsResponse,
  DeviceSummary,
  MonitoringApiService,
  SensorReading,
  TimeseriesPoint
} from '../services/monitoring-api.service';

interface AlertItem {
  deviceId: string;
  severity: string;
  parameter: string;
  value: string;
  timestamp: string;
}

interface ThresholdRule {
  parameter: string;
  unit: string;
  normal: string;
  warning: string;
  critical: string;
}

interface ActionPlan {
  title: string;
  steps: string[];
}

interface DeviceTypeConfig {
  label: string;
  thresholds: ThresholdRule[];
}

const DEVICE_TYPE_CONFIG: Record<string, DeviceTypeConfig> = {
  incubatore: {
    label: 'Incubatore Biologico',
    thresholds: [
      { parameter: 'Temperatura', unit: '°C', normal: '36-38', warning: '<36 o >38', critical: '<35 o >39' },
      { parameter: 'Vibrazione', unit: 'mm/s', normal: '<0.6', warning: '0.6–1.0', critical: '>1.0' },
    ],
  },
  cella_coltura: {
    label: 'Cella di Coltura',
    thresholds: [
      { parameter: 'Temperatura', unit: '°C', normal: '36–38', warning: '<36 o >38', critical: '<35 o >39' },
      { parameter: 'Vibrazione', unit: 'mm/s', normal: '<0.4', warning: '0.4–0.8', critical: '>0.8' },
    ],
  },
  banca_criogenica: {
    label: 'Banca Criogenica',
    thresholds: [
      { parameter: 'Temperatura', unit: '°C', normal: '< -194', warning: '> -192', critical: '> -190' },
      { parameter: 'Vibrazione', unit: 'mm/s', normal: '<0.5', warning: '0.5–1.0', critical: '>1.0' },
      { parameter: 'Livello Azoto', unit: '%', normal: '>40', warning: '35–40', critical: '<25' },
    ],
  },
  hvac: {
    label: 'Sistema HVAC',
    thresholds: [
      { parameter: 'Temperatura', unit: '°C', normal: '19–23', warning: '<19 o >23', critical: '<18 o >25' },
      { parameter: 'Vibrazione', unit: 'mm/s', normal: '<1.2', warning: '1.2–2.0', critical: '>2.0' },
    ],
  },
};

const ACTION_PLANS: Record<string, string[]> = {
  'banca_criogenica|CRITICAL|Temperatura': [
    'Verificare immediatamente il livello di azoto liquido', 'Non aprire il serbatoio', 'Contattare il responsabile del deposito', 'Avvisare il team di emergenza', "Documentare l'orario e i valori nel registro",
  ],
  'banca_criogenica|CRITICAL|Livello Azoto': [
    'Richiedere ricarica azoto urgente', 'Non aprire il serbatoio', 'Avvisare il responsabile entro 5 minuti', 'Verificare che i campioni siano ancora a temperatura', "Documentare l'evento nel registro",
  ],
  'incubatore|CRITICAL|Temperatura': [
    'Verificare che lo sportello sia chiuso correttamente', 'Controllare gli allarmi sul pannello del dispositivo', 'Contattare il tecnico di laboratorio', 'Valutare il trasferimento dei campioni', "Annotare l'evento nel registro",
  ],
  'hvac|CRITICAL|Vibrazione': [
    'Non avvicinarsi ai macchinari in movimento', 'Contattare immediatamente la manutenzione', 'Valutare lo spegnimento del sistema', 'Monitorare tutti i laboratori collegati', 'Documentare ora e intensità delle vibrazioni',
  ],
};

const DEFAULT_ACTION_PLAN: string[] = [
  'Verificare visivamente il dispositivo', 'Contattare il tecnico responsabile', 'Annotare i valori nel registro', 'Monitorare ogni 15 minuti', 'Avvisare il responsabile di turno',
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  host: { '[style.display]': '"flex"', '[style.flex-direction]': '"column"', '[style.flex]': '"1 1 0"', '[style.min-height]': '"0"' }
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  devices: DeviceSummary[] = [];
  readings: SensorReading[] = [];
  alertItems: AlertItem[] = [];
  selectedDevice: string | null = null;
  selectedLab: string | null = null;
  selectedMetric = 'temperatura';
  activeTab: 'chart' | 'letture' | 'alert' | 'analytics' = 'chart';
  analytics: AnalyticsResponse | null = null;
  selectedFrom = '';
  selectedTo = '';
  displayFrom = '';
  displayTo = '';
  pickerOpen: 'from' | 'to' | null = null;
  pickerDate = '';
  pickerHour = '00';
  pickerMin = '00';
  private chart?: Chart;
  private routeSub?: Subscription;
  lastChartPoints: TimeseriesPoint[] = [];

  selectedDeviceDetail: DeviceSummary | null = null;
  latestReading: SensorReading | null = null;

  constructor(
    private readonly api: MonitoringApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe((params) => {
      if (params['tab'] === 'alert') {
        this.activeTab = 'alert';
      }
    });
    this.loadDashboard();
    this.loadAlerts();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.routeSub?.unsubscribe();
  }

  loadDashboard(): void {
    this.api.getDevices().subscribe((devices) => {
      this.devices = devices;
      if (!this.selectedDevice && devices.length > 0) {
        this.selectedDevice = devices[0].device_id;
      }
      this.loadChartAndReadings();
      this.loadAnalytics();
    });
  }

  get reparti(): string[] {
    return [...new Set(this.devices.map((d) => d.reparto))].filter(Boolean).sort();
  }

  get filteredDevices(): DeviceSummary[] {
    if (!this.selectedLab) return this.devices;
    return this.devices.filter((d) => d.reparto === this.selectedLab);
  }

  onLabChange(): void {
    if (this.selectedDevice && !this.filteredDevices.some((d) => d.device_id === this.selectedDevice)) {
      this.selectedDevice = null;
    }
    this.loadChartAndReadings();
    this.loadAnalytics();
  }

  get filteredReadings(): SensorReading[] {
    let result = this.readings;
    if (this.selectedDevice) {
      result = result.filter((r) => r.device_id === this.selectedDevice);
    }
    if (this.selectedLab) {
      result = result.filter((r) => r.reparto === this.selectedLab);
    }
    if (this.selectedFrom) {
      result = result.filter((r) => new Date(r.timestamp) >= new Date(this.selectedFrom));
    }
    if (this.selectedTo) {
      result = result.filter((r) => new Date(r.timestamp) <= new Date(this.selectedTo));
    }
    return result;
  }

  get filteredAlerts(): AlertItem[] {
    let result = this.alertItems;
    if (this.selectedDevice) {
      result = result.filter((a) => a.deviceId === this.selectedDevice);
    }
    if (this.selectedLab) {
      result = result.filter((a) => {
        const dev = this.devices.find((d) => d.device_id === a.deviceId);
        return dev?.reparto === this.selectedLab;
      });
    }
    if (this.selectedFrom) {
      result = result.filter((a) => new Date(a.timestamp) >= new Date(this.selectedFrom));
    }
    if (this.selectedTo) {
      result = result.filter((a) => new Date(a.timestamp) <= new Date(this.selectedTo));
    }
    return result;
  }

  loadChartAndReadings(): void {
    this.api.getReadings(this.selectedDevice ?? undefined, 120).subscribe((rows) => {
      this.readings = rows;
      if (this.selectedDevice && rows.length > 0) {
        this.latestReading = rows[0];
      } else {
        this.latestReading = null;
      }
    });
    this.api
      .getTimeseries(this.selectedDevice, this.selectedMetric, 240)
      .subscribe((points) => this.renderChart(points));
    if (this.activeTab === 'analytics') {
      this.loadAnalytics();
    }
  }

  selectDevice(deviceId: string): void {
    if (this.selectedDevice === deviceId && this.selectedDeviceDetail) {
      this.closeDetail();
      return;
    }
    this.selectedDevice = deviceId;
    this.selectedDeviceDetail = this.devices.find((d) => d.device_id === deviceId) ?? null;
    this.loadChartAndReadings();
  }

  closeDetail(): void {
    this.selectedDeviceDetail = null;
    this.latestReading = null;
  }

  setTab(tab: 'chart' | 'letture' | 'alert' | 'analytics'): void {
    this.activeTab = tab;
    if (tab === 'chart' && this.lastChartPoints.length > 0) {
      setTimeout(() => this.renderChart(this.lastChartPoints), 50);
    }
    if (tab === 'analytics') {
      this.loadAnalytics();
    }
  }

  loadAnalytics(): void {
    this.api
      .getAnalytics(this.selectedDevice ?? undefined, this.selectedLab ?? undefined, this.selectedFrom, this.selectedTo)
      .subscribe((analytics) => (this.analytics = analytics));
  }

  loadAlerts(): void {
    this.api.getReadings(undefined, 500).subscribe((rows) => {
      const alertMap = new Map<string, AlertItem>();

      for (const row of rows) {
        const status = row.stato_dispositivo.toUpperCase();
        if (status !== 'CRITICAL' && status !== 'WARNING') continue;
        const sev = status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
        const key = `${row.device_id}|${sev}`;
        if (!alertMap.has(key)) {
          alertMap.set(key, {
            deviceId: row.device_id,
            severity: sev,
            parameter: 'Stato Dispositivo',
            value: sev,
            timestamp: row.timestamp,
          });
        }
      }

      this.api.getDevices().subscribe((devices) => {
        for (const device of devices) {
          if (device.critical_count > 0) {
            const key = `${device.device_id}|CRITICAL`;
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
            const key = `${device.device_id}|WARNING`;
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
        this.alertItems = Array.from(alertMap.values()).sort((a, b) => {
          const rank: Record<string, number> = { CRITICAL: 2, WARNING: 1 };
          const diff = (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0);
          if (diff !== 0) return diff;
          return b.timestamp.localeCompare(a.timestamp);
        });
      });
    });
  }

  openPicker(type: 'from' | 'to'): void {
    const existing = type === 'from' ? this.selectedFrom : this.selectedTo;
    if (existing) {
      const d = new Date(existing);
      if (!isNaN(d.getTime())) {
        this.pickerDate = d.toISOString().slice(0, 10);
        this.pickerHour = String(d.getHours()).padStart(2, '0');
        this.pickerMin = String(d.getMinutes()).padStart(2, '0');
      }
    } else {
      const now = new Date();
      this.pickerDate = now.toISOString().slice(0, 10);
      this.pickerHour = '00';
      this.pickerMin = '00';
    }
    this.pickerOpen = type;
  }

  confirmPicker(): void {
    if (!this.pickerDate) return;
    const iso = `${this.pickerDate}T${this.pickerHour}:${this.pickerMin}:00`;
    const formatted = this.formatTimestamp(iso);
    if (this.pickerOpen === 'from') {
      this.selectedFrom = iso;
      this.displayFrom = formatted;
    } else {
      this.selectedTo = iso;
      this.displayTo = formatted;
    }
    this.pickerOpen = null;
    this.loadChartAndReadings();
    this.loadAnalytics();
  }

  clearPicker(): void {
    if (this.pickerOpen === 'from') {
      this.selectedFrom = '';
      this.displayFrom = '';
    } else {
      this.selectedTo = '';
      this.displayTo = '';
    }
    this.pickerOpen = null;
    this.loadChartAndReadings();
    this.loadAnalytics();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.pickerOpen) {
      const target = event.target as HTMLElement;
      if (!target.closest('.picker-panel') && !target.closest('.date-picker-wrap')) {
        this.pickerOpen = null;
      }
    }
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

  getDeviceTypeConfig(deviceType: string): DeviceTypeConfig {
    return DEVICE_TYPE_CONFIG[deviceType] ?? { label: deviceType, thresholds: [] };
  }

  getParameterSeverity(deviceType: string, parameter: string, value: number | null): string {
    if (value === null) return 'ok';
    if (deviceType === 'banca_criogenica') {
      if (parameter === 'Temperatura') {
        if (value <= -194) return 'ok';
        if (value <= -192) return 'warning';
        return 'critical';
      }
      if (parameter === 'Vibrazione') {
        if (value < 0.5) return 'ok';
        if (value < 1.0) return 'warning';
        return 'critical';
      }
      if (parameter === 'Livello Azoto') {
        if (value > 40) return 'ok';
        if (value >= 35) return 'warning';
        return 'critical';
      }
    }
    if (deviceType === 'incubatore' || deviceType === 'cella_coltura') {
      const vibLimit = deviceType === 'incubatore' ? 0.6 : 0.4;
      const vibWarn = deviceType === 'incubatore' ? 1.0 : 0.8;
      if (parameter === 'Temperatura') {
        if (value >= 36 && value <= 38) return 'ok';
        if (value >= 35 && value <= 39) return 'warning';
        return 'critical';
      }
      if (parameter === 'Vibrazione') {
        if (value < vibLimit) return 'ok';
        if (value < vibWarn) return 'warning';
        return 'critical';
      }
    }
    if (deviceType === 'hvac') {
      if (parameter === 'Temperatura') {
        if (value >= 19 && value <= 23) return 'ok';
        if (value >= 18 && value <= 25) return 'warning';
        return 'critical';
      }
      if (parameter === 'Vibrazione') {
        if (value < 1.2) return 'ok';
        if (value < 2.0) return 'warning';
        return 'critical';
      }
    }
    return 'ok';
  }

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'critical': case 'CRITICAL': return 'critical';
      case 'warning': case 'WARNING': return 'warning';
      default: return 'ok';
    }
  }

  getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'critical': case 'CRITICAL': return 'CRITICO';
      case 'warning': case 'WARNING': return 'WARNING';
      default: return 'OK';
    }
  }

  getSeverityBadgeClass(severity?: string | null): string {
    switch ((severity ?? '').toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300';
      case 'WARNING':
        return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300';
      default:
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    }
  }

  getPrimaryRiskDevice(): AnalyticsResponse['predictive']['device_risk_scores'][number] | null {
    return this.analytics?.predictive.device_risk_scores[0] ?? null;
  }

  getFastestNitrogenRisk(): AnalyticsResponse['predictive']['nitrogen_time_to_critical'][number] | null {
    return this.analytics?.predictive.nitrogen_time_to_critical.find((item) => item.time_to_critical_hours !== null) ?? null;
  }

  formatHours(hours: number | null | undefined): string {
    if (hours === null || hours === undefined) return 'Stabile';
    if (hours < 1) return '< 1 h';
    return `${hours.toFixed(1)} h`;
  }

  getWorstParameterSeverity(): string {
    if (!this.selectedDeviceDetail || !this.latestReading) return 'ok';
    const deviceType = this.selectedDeviceDetail.device_type;
    const severities = [
      this.getParameterSeverity(deviceType, 'Temperatura', this.latestReading.temperatura),
      this.getParameterSeverity(deviceType, 'Vibrazione', this.latestReading.vibrazione),
    ];
    if (deviceType === 'banca_criogenica') {
      severities.push(this.getParameterSeverity(deviceType, 'Livello Azoto', this.latestReading.livello_azoto));
    }
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('warning')) return 'warning';
    return 'ok';
  }

  getActionPlans(): ActionPlan[] {
    if (!this.selectedDeviceDetail || !this.latestReading) return [];
    const deviceType = this.selectedDeviceDetail.device_type;
    const plans: ActionPlan[] = [];
    const reading = this.latestReading;
    const checks: { param: string; value: number | null }[] = [
      { param: 'Temperatura', value: reading.temperatura },
      { param: 'Vibrazione', value: reading.vibrazione },
    ];
    if (deviceType === 'banca_criogenica') {
      checks.push({ param: 'Livello Azoto', value: reading.livello_azoto });
    }
    for (const check of checks) {
      const severity = this.getParameterSeverity(deviceType, check.param, check.value);
      if (severity === 'ok') continue;
      const keyCrit = `${deviceType}|CRITICAL|${check.param}`;
      const keyWarn = `${deviceType}|WARNING|${check.param}`;
      const steps = ACTION_PLANS[keyCrit] ?? ACTION_PLANS[keyWarn] ?? DEFAULT_ACTION_PLAN;
      plans.push({ title: `${check.param} — ${this.getSeverityLabel(severity)}`, steps });
    }
    return plans;
  }

  getDeviceLabel(deviceId: string): string {
    const d = this.devices.find((dev) => dev.device_id === deviceId);
    return d ? `${d.device_type}` : deviceId;
  }

  private renderChart(points: TimeseriesPoint[]): void {
    this.lastChartPoints = points;
    if (this.activeTab !== 'chart') {
      return;
    }
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) {
      setTimeout(() => this.renderChart(points), 50);
      return;
    }
    this.chart?.destroy();
    const metricLabel = this.selectedMetric === 'temperatura' ? 'Temperatura (°C)' : this.selectedMetric === 'vibrazione' ? 'Vibrazione (mm/s)' : 'Livello Azoto (%)';
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: points.map((p) => p.timestamp),
        datasets: [{
          label: metricLabel,
          data: points.map((p) => p.value),
          borderColor: '#177ddc',
          backgroundColor: 'rgba(23,125,220,0.12)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          subtitle: {
            display: !!(this.selectedDevice),
            text: this.selectedDevice ? `${this.selectedDevice} — ${metricLabel}` : '',
            color: '#6b7280',
            font: { size: 11, weight: '500' },
            align: 'start',
            padding: { bottom: 8 },
          },
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 8,
              maxRotation: 0,
              minRotation: 0,
              callback: (_v: any, i: number): string | string[] => {
                const label = points[i]?.timestamp;
                if (!label) return '';
                const d = new Date(label);
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const hh = String(d.getHours()).padStart(2, '0');
                const min = String(d.getMinutes()).padStart(2, '0');
                return [`${dd}/${mm}`, `${hh}:${min}`];
              },
            },
          },
        },
      },
    } as any);
  }
}
