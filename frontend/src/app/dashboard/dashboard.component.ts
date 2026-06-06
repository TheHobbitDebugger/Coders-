import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import {
  DeviceSummary,
  MonitoringApiService,
  SensorReading,
  TimeseriesPoint
} from '../services/monitoring-api.service';

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
      { parameter: 'Temperatura', unit: '°C', normal: '36–38', warning: '<36 o >38', critical: '<35 o >39' },
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
    'Verificare immediatamente il livello di azoto liquido',
    'Non aprire il serbatoio',
    'Contattare il responsabile del deposito',
    'Avvisare il team di emergenza',
    'Documentare l\'orario e i valori nel registro',
  ],
  'banca_criogenica|CRITICAL|Livello Azoto': [
    'Richiedere ricarica azoto urgente',
    'Non aprire il serbatoio',
    'Avvisare il responsabile entro 5 minuti',
    'Verificare che i campioni siano ancora a temperatura',
    'Documentare l\'evento nel registro',
  ],
  'incubatore|CRITICAL|Temperatura': [
    'Verificare che lo sportello sia chiuso correttamente',
    'Controllare gli allarmi sul pannello del dispositivo',
    'Contattare il tecnico di laboratorio',
    'Valutare il trasferimento dei campioni',
    'Annotare l\'evento nel registro',
  ],
  'hvac|CRITICAL|Vibrazione': [
    'Non avvicinarsi ai macchinari in movimento',
    'Contattare immediatamente la manutenzione',
    'Valutare lo spegnimento del sistema',
    'Monitorare tutti i laboratori collegati',
    'Documentare ora e intensità delle vibrazioni',
  ],
};

const DEFAULT_ACTION_PLAN: string[] = [
  'Verificare visivamente il dispositivo',
  'Contattare il tecnico responsabile',
  'Annotare i valori nel registro',
  'Monitorare ogni 15 minuti',
  'Avvisare il responsabile di turno',
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  host: { '[style.display]': '"flex"', '[style.flex-direction]': '"column"', '[style.flex]': '"1 1 0"', '[style.min-height]': '"0"' }
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  devices: DeviceSummary[] = [];
  readings: SensorReading[] = [];
  selectedDevice: string | null = null;
  selectedMetric = 'temperatura';
  private chart?: Chart;

  selectedDeviceDetail: DeviceSummary | null = null;
  latestReading: SensorReading | null = null;

  constructor(private readonly api: MonitoringApiService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  loadDashboard(): void {
    this.api.getDevices().subscribe((devices) => {
      this.devices = devices;
      if (!this.selectedDevice && devices.length > 0) {
        this.selectedDevice = devices[0].device_id;
      }
      this.loadChartAndReadings();
    });
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
  }

  selectDevice(deviceId: string): void {
    this.selectedDevice = deviceId;
    this.selectedDeviceDetail = this.devices.find((d) => d.device_id === deviceId) ?? null;
    this.loadChartAndReadings();
  }

  closeDetail(): void {
    this.selectedDeviceDetail = null;
    this.latestReading = null;
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
      case 'critical': return 'critical';
      case 'warning': return 'warning';
      default: return 'ok';
    }
  }

  getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'critical': return 'CRITICO';
      case 'warning': return 'WARNING';
      default: return 'OK';
    }
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

  getParameterLabel(param: string): string {
    switch (param) {
      case 'Temperatura': return 'Temperatura';
      case 'Vibrazione': return 'Vibrazione';
      case 'Livello Azoto': return 'Livello Azoto';
      default: return param;
    }
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
      plans.push({
        title: `${check.param} — ${this.getSeverityLabel(severity)}`,
        steps,
      });
    }
    return plans;
  }

  private renderChart(points: TimeseriesPoint[]): void {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) {
      setTimeout(() => this.renderChart(points));
      return;
    }

    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: points.map((point) => point.timestamp.slice(0, 16)),
        datasets: [
          {
            label: this.selectedMetric,
            data: points.map((point) => point.value),
            borderColor: '#177ddc',
            backgroundColor: 'rgba(23, 125, 220, 0.12)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { maxTicksLimit: 8 } }
        }
      }
    });
  }
}
