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

export interface AnalyticsResponse {
  top_problem_devices: Array<{
    device_id: string;
    device_type: string;
    reparto: string;
    warning_count: number;
    critical_count: number;
    score: number;
  }>;
  most_unstable_parameter: {
    parameter: string;
    stddev: number;
    sample_count: number;
  } | null;
  riskiest_reparto: {
    reparto: string;
    warning_count: number;
    critical_count: number;
    score: number;
  } | null;
  average_critical_duration_minutes: number | null;
  anomalies_by_hour: Array<{
    hour: number;
    count: number;
  }>;
  average_threshold_deviation: {
    by_parameter: Array<{
      parameter: string;
      average_deviation: number;
      sample_count: number;
    }>;
  };
  sensor_stability: Array<{
    device_id: string;
    parameter: string;
    average: number;
    stddev: number;
    sample_count: number;
    status: string;
  }>;
  predictive: {
    device_risk_scores: Array<{
      device_id: string;
      device_type: string;
      reparto: string;
      score: number;
      severity: string;
      warning_count: number;
      critical_count: number;
    }>;
    temperature_trends: Array<{
      device_id: string;
      slope_per_hour: number;
      direction: string;
      latest_value: number;
      time_to_critical_hours: number | null;
    }>;
    nitrogen_time_to_critical: Array<{
      device_id: string;
      slope_per_hour: number;
      direction: string;
      latest_value: number;
      critical_threshold: number | null;
      time_to_critical_hours: number | null;
      status: string;
    }>;
    hvac_failure_probability: {
      device_id: string;
      probability: number | null;
      severity: string;
      max_vibration: number | null;
      vibration_slope_per_hour: number | null;
    };
    suspicious_sensors: Array<{
      device_id: string;
      parameter: string;
      reason: string;
      stddev: number;
      zero_ratio: number;
    }>;
    recurring_anomalies: Array<{
      device_id: string;
      severity: string;
      hour: number;
      days_count: number;
      pattern: string;
    }>;
  };
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

  getReadings(deviceId?: string, limit = 100): Observable<SensorReading[]> {
    let params = new HttpParams().set('limit', limit);
    if (deviceId) {
      params = params.set('device_id', deviceId);
    }
    return this.http.get<SensorReading[]>(`${this.baseUrl}/readings`, { params });
  }

  getTimeseries(deviceId: string | null, metric: string, limit = 240): Observable<TimeseriesPoint[]> {
    let params = new HttpParams().set('metric', metric).set('limit', limit);
    if (deviceId) {
      params = params.set('device_id', deviceId);
    }
    return this.http.get<TimeseriesPoint[]>(`${this.baseUrl}/timeseries`, { params });
  }

  getAnalytics(deviceId?: string, reparto?: string, from?: string, to?: string): Observable<AnalyticsResponse> {
    let params = new HttpParams();
    if (deviceId) {
      params = params.set('device_id', deviceId);
    }
    if (reparto) {
      params = params.set('reparto', reparto);
    }
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get<AnalyticsResponse>(`${this.baseUrl}/analytics`, { params });
  }
}
