import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MonitoringApiService, SensorReading } from '../services/monitoring-api.service';

interface FilterState {
  reparto: string;
  stato: string;
  deviceType: string;
  dateFrom: string;
  dateTo: string;
}

@Component({
  selector: 'app-letture',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './letture.component.html',
  host: { '[style.display]': '"flex"', '[style.flex-direction]': '"column"', '[style.flex]': '"1 1 0"', '[style.min-height]': '"0"' }
})
export class LettureComponent implements OnInit {
  readings: SensorReading[] = [];
  filteredReadings: SensorReading[] = [];
  displayedReadings: SensorReading[] = [];

  filter: FilterState = {
    reparto: 'Tutti',
    stato: 'Tutti',
    deviceType: 'Tutti',
    dateFrom: '',
    dateTo: '',
  };

  sortColumn = 'timestamp';
  sortDirection: 'asc' | 'desc' = 'desc';

  pageSize = 25;
  currentPage = 1;
  totalPages = 1;

  constructor(private readonly api: MonitoringApiService) {}

  ngOnInit(): void {
    this.api.getReadings(undefined, 500).subscribe((rows) => {
      this.readings = rows;
      this.applyFilters();
    });
  }

  applyFilters(): void {
    let result = [...this.readings];

    if (this.filter.reparto !== 'Tutti') {
      result = result.filter((r) => r.reparto === this.filter.reparto);
    }
    if (this.filter.stato !== 'Tutti') {
      result = result.filter((r) => r.stato_dispositivo.toLowerCase() === this.filter.stato.toLowerCase());
    }
    if (this.filter.deviceType !== 'Tutti') {
      const typeMap: Record<string, string> = {
        'Incubatore': 'incubatore',
        'Cella di Coltura': 'cella_coltura',
        'Banca Criogenica': 'banca_criogenica',
        'HVAC': 'hvac',
      };
      const mapped = typeMap[this.filter.deviceType] ?? this.filter.deviceType.toLowerCase();
      result = result.filter((r) => r.device_type === mapped);
    }
    if (this.filter.dateFrom) {
      const from = new Date(this.filter.dateFrom).getTime();
      result = result.filter((r) => new Date(r.timestamp).getTime() >= from);
    }
    if (this.filter.dateTo) {
      const to = new Date(this.filter.dateTo).getTime();
      result = result.filter((r) => new Date(r.timestamp).getTime() <= to);
    }

    this.filteredReadings = result;
    this.sortData();
    this.currentPage = 1;
    this.updatePagination();
  }

  sortData(): void {
    this.filteredReadings.sort((a, b) => {
      const aVal = this.getSortValue(a, this.sortColumn);
      const bVal = this.getSortValue(b, this.sortColumn);

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const compare = String(aVal).localeCompare(String(bVal));
      return this.sortDirection === 'asc' ? compare : -compare;
    });
    this.updatePagination();
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortData();
  }

  getSortValue(row: SensorReading, column: string): any {
    switch (column) {
      case 'timestamp': return row.timestamp;
      case 'device_id': return row.device_id;
      case 'device_type': return row.device_type;
      case 'reparto': return row.reparto;
      case 'temperatura': return row.temperatura;
      case 'vibrazione': return row.vibrazione;
      case 'livello_azoto': return row.livello_azoto;
      case 'stato_dispositivo': return row.stato_dispositivo;
      default: return '';
    }
  }

  getSortIndicator(column: string): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredReadings.length / this.pageSize));
    const start = (this.currentPage - 1) * this.pageSize;
    this.displayedReadings = this.filteredReadings.slice(start, start + this.pageSize);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  getDeviceTypeItalian(type: string): string {
    const map: Record<string, string> = {
      incubatore: 'Incubatore',
      cella_coltura: 'Cella di Coltura',
      banca_criogenica: 'Banca Criogenica',
      hvac: 'HVAC',
    };
    return map[type] ?? type;
  }

  getRowClass(row: SensorReading): string {
    const s = row.stato_dispositivo.toLowerCase();
    if (s === 'critical') return 'row-critical';
    if (s === 'warning') return 'row-warning';
    return '';
  }
}
