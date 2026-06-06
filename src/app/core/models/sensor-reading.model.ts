import { DeviceType, AlertSeverity } from './device-type.enum';

export interface SensorReading {
  timestamp: Date;
  deviceId: string;
  deviceType: DeviceType;
  reparto: string;
  temperatura: number;
  vibrazione: number;
  livelloAzoto: number | null;
  statoDispositivo: AlertSeverity;
}
