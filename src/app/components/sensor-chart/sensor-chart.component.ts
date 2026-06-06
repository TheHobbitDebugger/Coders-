import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { DeviceStatus } from '../../core/models/device-status.model';
import { DeviceType } from '../../core/models/device-type.enum';
import { getThresholdsForDevice } from '../../core/utils/threshold-rules';
import { LucideAngularModule, LineChart } from 'lucide-angular';

@Component({
  selector: 'app-sensor-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, LucideAngularModule],
  templateUrl: './sensor-chart.component.html',
})
export class SensorChartComponent implements OnChanges {
  @Input() device: DeviceStatus | null = null;

  chartData: ChartData<'line'> | null = null;
  chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 11 } },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        ticks: { color: '#94a3b8', font: { size: 10 } },
        grid: { color: '#334155' },
      },
    },
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['device'] && this.device) {
      this.buildChart();
    } else if (changes['device'] && !this.device) {
      this.chartData = null;
    }
  }

  private buildChart(): void {
    const device = this.device!;
    const history = [...device.history].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const labels = history.map((r) =>
      r.timestamp.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    );

    const tempData = history.map((r) => r.temperatura);
    const vibData = history.map((r) => r.vibrazione);

    const thresholds = getThresholdsForDevice(device.deviceType);
    const tempThreshold = thresholds?.thresholds.find((t) => t.parameter === 'Temperatura');
    const vibThreshold = thresholds?.thresholds.find((t) => t.parameter === 'Vibrazione');

    const datasets: any[] = [];

    if (device.deviceType !== 'banca_criogenica') {
      datasets.push({
        label: 'Temperatura (°C)',
        data: tempData,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: 'y',
      });
    }

    datasets.push({
      label: 'Vibrazione (mm/s)',
      data: vibData,
      borderColor: '#a855f7',
      backgroundColor: 'rgba(168,85,247,0.1)',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      yAxisID: device.deviceType !== 'banca_criogenica' ? 'y1' : 'y',
    });

    if (device.deviceType === 'banca_criogenica') {
      const n2Data = history.map((r) => r.livelloAzoto ?? null);
      datasets.push({
        label: 'Livello Azoto (%)',
        data: n2Data,
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34,211,238,0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: 'y1',
      });

      if (tempThreshold) {
        datasets.push(this.refLine(labels, tempThreshold.warningMax!, 'Soglia Temp WARNING', '#eab308', 'y'));
        datasets.push(this.refLine(labels, tempThreshold.criticalMax!, 'Soglia Temp CRITICAL', '#ef4444', 'y'));
      }
    }

    if (vibThreshold) {
      if (device.deviceType !== 'banca_criogenica') {
        datasets.push(this.refLine(labels, vibThreshold.warningMin!, 'Soglia Vib WARNING', '#eab308', 'y1'));
        datasets.push(this.refLine(labels, vibThreshold.criticalMin!, 'Soglia Vib CRITICAL', '#ef4444', 'y1'));
      } else {
        datasets.push(this.refLine(labels, vibThreshold.warningMin!, 'Soglia Vib WARNING', '#eab308', 'y'));
        datasets.push(this.refLine(labels, vibThreshold.criticalMin!, 'Soglia Vib CRITICAL', '#ef4444', 'y'));
      }
    }

    if (tempThreshold && device.deviceType !== 'banca_criogenica') {
      if (tempThreshold.normalMin !== undefined) {
        datasets.push(this.refLine(labels, tempThreshold.normalMin, 'Soglia Temp Normale Min', '#22c55e', 'y'));
      }
      if (tempThreshold.normalMax !== undefined) {
        datasets.push(this.refLine(labels, tempThreshold.normalMax, 'Soglia Temp Normale Max', '#22c55e', 'y'));
      }
      datasets.push(this.refLine(labels, tempThreshold.warningMin!, 'Soglia Temp WARNING', '#eab308', 'y'));
      datasets.push(this.refLine(labels, tempThreshold.warningMax!, 'Soglia Temp WARNING', '#eab308', 'y'));
      datasets.push(this.refLine(labels, tempThreshold.criticalMin !== undefined && tempThreshold.criticalMin !== -Infinity ? tempThreshold.criticalMin : tempThreshold.warningMin!, 'Soglia Temp CRITICAL', '#ef4444', 'y'));
      datasets.push(this.refLine(labels, tempThreshold.criticalMax !== undefined && tempThreshold.criticalMax !== Infinity ? tempThreshold.criticalMax : tempThreshold.warningMax!, 'Soglia Temp CRITICAL', '#ef4444', 'y'));
    }

    const yAxes: any = {};
    if (device.deviceType !== 'banca_criogenica') {
      yAxes['y'] = {
        type: 'linear',
        position: 'left',
        title: { display: true, text: '°C', color: '#f97316' },
        ticks: { color: '#f97316' },
        grid: { color: '#334155' },
      };
    } else {
      yAxes['y'] = {
        type: 'linear',
        position: 'left',
        title: { display: true, text: '°C', color: '#f97316' },
        ticks: { color: '#f97316' },
        grid: { color: '#334155' },
      };
    }

    if (device.deviceType !== 'banca_criogenica') {
      yAxes['y1'] = {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'mm/s', color: '#a855f7' },
        ticks: { color: '#a855f7' },
        grid: { display: false },
      };
    } else {
      yAxes['y1'] = {
        type: 'linear',
        position: 'right',
        title: { display: true, text: '% / mm/s', color: '#22d3ee' },
        ticks: { color: '#22d3ee' },
        grid: { display: false },
      };
    }

    this.chartData = {
      labels,
      datasets,
    };

    this.chartOptions = {
      ...this.chartOptions,
      scales: yAxes,
    } as ChartOptions<'line'>;
  }

  private refLine(
    labels: string[],
    value: number | undefined,
    label: string,
    color: string,
    yAxisID: string
  ): any {
    return {
      label,
      data: labels.map(() => value ?? 0),
      borderColor: color,
      borderWidth: 1,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      yAxisID,
    };
  }
}
