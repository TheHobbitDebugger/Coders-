import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import * as Papa from 'papaparse';
import { SensorReading } from '../models/sensor-reading.model';
import { DeviceType, AlertSeverity } from '../models/device-type.enum';

@Injectable({ providedIn: 'root' })
export class CsvParserService {
  loadCSV(path: string): Observable<SensorReading[]> {
    return from(
      fetch(path).then((res) => {
        if (!res.ok) throw new Error(`Impossibile caricare ${path}`);
        return res.text();
      })
    ).pipe(
      map((csvText) => {
        const parsed = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          delimiter: ',',
        });
        return (parsed.data as Record<string, string>[])
          .filter((row) => row['timestamp'] && row['device_id'])
          .map((row) => this.mapRow(row));
      })
    );
  }

  private mapRow(row: Record<string, string>): SensorReading {
    const tipo = this.mapDeviceType(row['device_type'] || '');

    return {
      timestamp: new Date(row['timestamp']),
      deviceId: row['device_id'],
      deviceType: tipo,
      reparto: row['reparto'] || '',
      temperatura: parseFloat(row['temperatura']) || 0,
      vibrazione: parseFloat(row['vibrazione']) || 0,
      livelloAzoto:
        row['livello_azoto'] !== undefined && row['livello_azoto'] !== ''
          ? parseFloat(row['livello_azoto'])
          : null,
      statoDispositivo: this.mapSeverity(row['stato_dispositivo'] || 'OK'),
    };
  }

  private mapDeviceType(raw: string): DeviceType {
    const lower = raw.toLowerCase().trim();
    if (lower.includes('incubatore') || lower.includes('inc')) return 'incubatore';
    if (lower.includes('coltura') || lower.includes('cella') || lower.includes('cult'))
      return 'cella_coltura';
    if (lower.includes('criogenica') || lower.includes('banca') || lower.includes('cryo'))
      return 'banca_criogenica';
    if (lower.includes('hvac')) return 'hvac';
    return 'incubatore';
  }

  private mapSeverity(raw: string): AlertSeverity {
    const upper = raw.toUpperCase().trim();
    if (upper === 'WARNING') return 'WARNING';
    if (upper === 'CRITICAL') return 'CRITICAL';
    return 'OK';
  }
}
