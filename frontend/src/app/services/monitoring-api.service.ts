import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Kpis {
  total_readings: number;
  devices_count: number;
  warning_count: number;
  critical_count: number;
  last_seen: string | null;
}

export interface DeviceSummary {
  device_id: string;
  device_type: string;
  reparto: string;
  laboratorio: string;
  reading_count: number;
  last_seen: string | null;
  warning_count: number;
  critical_count: number;
}

export interface SensorReading {
  id: number;
  timestamp: string;
  device_id: string;
  device_type: string;
  reparto: string;
  temperatura: number | null;
  vibrazione: number | null;
  livello_azoto: number | null;
  stato_dispositivo: string;
}

export interface TimeseriesPoint {
  timestamp: string;
  value: number | null;
}

@Injectable({ providedIn: 'root' })
export class MonitoringApiService {
  private readonly baseUrl = '/api';

  constructor(private readonly http: HttpClient) {}

  getKpis(): Observable<Kpis> {
    return this.http.get<Kpis>(`${this.baseUrl}/kpis`);
  }

  getDevices(): Observable<DeviceSummary[]> {
    return this.http.get<DeviceSummary[]>(`${this.baseUrl}/devices`);
  }

  getReadings(deviceId?: string, limit = 100, from?: string, to?: string, lab?: string): Observable<SensorReading[]> {
    let params = new HttpParams().set('limit', limit);
    if (deviceId) {
      params = params.set('device_id', deviceId);
    }
    if (lab) {
      params = params.set('lab', lab);
    }
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get<SensorReading[]>(`${this.baseUrl}/readings`, { params });
  }

  getTimeseries(
    deviceId: string | null,
    metric: string,
    limit = 240,
    from?: string,
    to?: string,
    lab?: string
  ): Observable<TimeseriesPoint[]> {
    let params = new HttpParams().set('metric', metric).set('limit', limit);
    if (deviceId) {
      params = params.set('device_id', deviceId);
    }
    if (lab) {
      params = params.set('lab', lab);
    }
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get<TimeseriesPoint[]>(`${this.baseUrl}/timeseries`, { params });
  }
}
