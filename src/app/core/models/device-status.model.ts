import { DeviceType, AlertSeverity } from './device-type.enum';
import { SensorReading } from './sensor-reading.model';

export interface AlertItem {
  deviceId: string;
  reparto: string;
  parameter: string;
  value: number;
  unit: string;
  severity: AlertSeverity;
  timestamp: Date;
}

export interface DeviceStatus {
  deviceId: string;
  deviceType: DeviceType;
  reparto: string;
  latestReading: SensorReading;
  computedSeverity: AlertSeverity;
  activeAlerts: AlertItem[];
  history: SensorReading[];
}

export interface FilterState {
  reparto: string;
  status: string;
  deviceType: string;
}
