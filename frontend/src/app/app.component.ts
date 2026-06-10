import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MonitoringApiService, Kpis, SensorReading, DeviceSummary, TimeseriesPoint } from './services/monitoring-api.service';

interface Chart {

}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
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
  isDarkMode = false;
  showAlerts: boolean = false;
  alertItems: any[] = [];
  loading: boolean = false;
  private chart?: Chart;

  constructor(private readonly api: MonitoringApiService) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.checkThemeOnLoad();
  }

  // Check theme on webapp load
  checkThemeOnLoad() {
    const persistedTheme = localStorage.getItem('theme');
    if (persistedTheme === 'dark' || 
       (!persistedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.setDarkMode(true);
    } else {
      this.setDarkMode(false);
    }
  }
  
  toggleTheme(){
    this.setDarkMode(!this.isDarkMode);
  }

  setDarkMode(isDark: boolean) {
    this.isDarkMode = isDark;
    const htmlElement = document.documentElement;

    if(isDark) {
      htmlElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      htmlElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  loadDashboard(): void {
    this.loading = true;
    this.api.getKpis().subscribe({
      next: (kpis) => {
        this.kpis = kpis;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
