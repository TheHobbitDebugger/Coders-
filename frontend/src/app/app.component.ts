import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import {
  DeviceSummary,
  Kpis,
  MonitoringApiService,
  SensorReading,
  TimeseriesPoint
} from './services/monitoring-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  kpis: Kpis | null = null;
  devices: DeviceSummary[] = [];
  readings: SensorReading[] = [];
  selectedDevice: string | null = null;
  selectedMetric = 'temperatura';
  private chart?: Chart;

  constructor(private readonly api: MonitoringApiService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
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

  loadChartAndReadings(): void {
    this.api.getReadings(this.selectedDevice ?? undefined, 120).subscribe((rows) => (this.readings = rows));
    this.api
      .getTimeseries(this.selectedDevice, this.selectedMetric, 240)
      .subscribe((points) => this.renderChart(points));
  }

  selectDevice(deviceId: string): void {
    this.selectedDevice = deviceId;
    this.loadChartAndReadings();
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
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 8
            }
          }
        }
      }
    });
  }
}
