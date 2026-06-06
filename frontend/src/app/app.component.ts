import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MonitoringApiService, Kpis } from './services/monitoring-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  kpis: Kpis | null = null;
  loading = false;

  constructor(private readonly api: MonitoringApiService) {}

  ngOnInit(): void {
    this.loadDashboard();
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
