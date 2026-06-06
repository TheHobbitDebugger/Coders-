import { Injectable } from '@angular/core';
import { SensorReading } from '../models/sensor-reading.model';
import { AlertSeverity } from '../models/device-type.enum';
import { AlertItem } from '../models/device-status.model';
import { getThresholdsForDevice, evaluateThreshold } from '../utils/threshold-rules';

@Injectable({ providedIn: 'root' })
export class ThresholdService {
  computeSeverity(reading: SensorReading): AlertSeverity {
    const deviceThresholds = getThresholdsForDevice(reading.deviceType);
    if (!deviceThresholds) return 'OK';

    let worstSeverity: AlertSeverity = 'OK';
    for (const threshold of deviceThresholds.thresholds) {
      const value = this.getParameterValue(reading, threshold.parameter);
      if (value === null) continue;

      const severity = evaluateThreshold(value, threshold);
      worstSeverity = this.worseSeverity(worstSeverity, severity);
    }
    return worstSeverity;
  }

  getAlerts(reading: SensorReading): AlertItem[] {
    const deviceThresholds = getThresholdsForDevice(reading.deviceType);
    if (!deviceThresholds) return [];

    const alerts: AlertItem[] = [];
    for (const threshold of deviceThresholds.thresholds) {
      const value = this.getParameterValue(reading, threshold.parameter);
      if (value === null) continue;

      const severity = evaluateThreshold(value, threshold);
      if (severity !== 'OK') {
        alerts.push({
          deviceId: reading.deviceId,
          reparto: reading.reparto,
          parameter: threshold.parameter,
          value,
          unit: threshold.unit,
          severity,
          timestamp: reading.timestamp,
        });
      }
    }
    return alerts;
  }

  private getParameterValue(reading: SensorReading, parameter: string): number | null {
    switch (parameter) {
      case 'Temperatura':
        return reading.temperatura;
      case 'Vibrazione':
        return reading.vibrazione;
      case 'Livello Azoto':
        return reading.livelloAzoto;
      default:
        return null;
    }
  }

  worseSeverity(a: AlertSeverity, b: AlertSeverity): AlertSeverity {
    const rank: Record<AlertSeverity, number> = { OK: 0, WARNING: 1, CRITICAL: 2 };
    return rank[a] >= rank[b] ? a : b;
  }
}
