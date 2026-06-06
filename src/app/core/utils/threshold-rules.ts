import { DeviceType, AlertSeverity } from '../models/device-type.enum';

export interface ParameterThreshold {
  parameter: string;
  unit: string;
  normalMin?: number;
  normalMax?: number;
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  direction: 'range' | 'min' | 'max';
}

export interface DeviceThreshold {
  deviceType: DeviceType;
  label: string;
  thresholds: ParameterThreshold[];
}

export const DEVICE_THRESHOLDS: DeviceThreshold[] = [
  {
    deviceType: 'incubatore',
    label: 'Incubatori Biologici',
    thresholds: [
      {
        parameter: 'Temperatura',
        unit: '°C',
        normalMin: 36,
        normalMax: 38,
        warningMin: 35,
        warningMax: 39,
        criticalMin: -Infinity,
        criticalMax: Infinity,
        direction: 'range',
      },
      {
        parameter: 'Vibrazione',
        unit: 'mm/s',
        normalMax: 0.6,
        warningMin: 0.6,
        warningMax: 1.0,
        criticalMin: 1.0,
        criticalMax: Infinity,
        direction: 'max',
      },
    ],
  },
  {
    deviceType: 'cella_coltura',
    label: 'Celle di Coltura',
    thresholds: [
      {
        parameter: 'Temperatura',
        unit: '°C',
        normalMin: 36,
        normalMax: 38,
        warningMin: 35,
        warningMax: 39,
        criticalMin: -Infinity,
        criticalMax: Infinity,
        direction: 'range',
      },
      {
        parameter: 'Vibrazione',
        unit: 'mm/s',
        normalMax: 0.4,
        warningMin: 0.4,
        warningMax: 0.8,
        criticalMin: 0.8,
        criticalMax: Infinity,
        direction: 'max',
      },
    ],
  },
  {
    deviceType: 'banca_criogenica',
    label: 'Banche Criogeniche',
    thresholds: [
      {
        parameter: 'Temperatura',
        unit: '°C',
        normalMin: -Infinity,
        normalMax: -194,
        warningMin: -Infinity,
        warningMax: -192,
        criticalMin: -Infinity,
        criticalMax: -190,
        direction: 'max',
      },
      {
        parameter: 'Livello Azoto',
        unit: '%',
        normalMin: 40,
        normalMax: Infinity,
        warningMin: 35,
        warningMax: 40,
        criticalMin: -Infinity,
        criticalMax: 25,
        direction: 'min',
      },
      {
        parameter: 'Vibrazione',
        unit: 'mm/s',
        normalMax: 0.5,
        warningMin: 0.5,
        warningMax: 1.0,
        criticalMin: 1.0,
        criticalMax: Infinity,
        direction: 'max',
      },
    ],
  },
  {
    deviceType: 'hvac',
    label: 'HVAC',
    thresholds: [
      {
        parameter: 'Temperatura',
        unit: '°C',
        normalMin: 19,
        normalMax: 23,
        warningMin: 18,
        warningMax: 25,
        criticalMin: -Infinity,
        criticalMax: Infinity,
        direction: 'range',
      },
      {
        parameter: 'Vibrazione',
        unit: 'mm/s',
        normalMax: 1.2,
        warningMin: 1.2,
        warningMax: 2.0,
        criticalMin: 2.0,
        criticalMax: Infinity,
        direction: 'max',
      },
    ],
  },
];

export function getThresholdsForDevice(deviceType: DeviceType): DeviceThreshold | undefined {
  return DEVICE_THRESHOLDS.find((d) => d.deviceType === deviceType);
}

export function evaluateThreshold(
  value: number,
  threshold: ParameterThreshold
): AlertSeverity {
  const { direction, normalMin, normalMax, warningMin, warningMax, criticalMin, criticalMax } =
    threshold;

  if (direction === 'range') {
    if (
      normalMin !== undefined &&
      normalMax !== undefined &&
      value >= normalMin &&
      value <= normalMax
    ) {
      return 'OK';
    }
    if (
      warningMin !== undefined &&
      warningMax !== undefined &&
      value >= warningMin! &&
      value <= warningMax!
    ) {
      return 'WARNING';
    }
    return 'CRITICAL';
  }

  if (direction === 'max') {
    if (normalMax !== undefined && value < normalMax) return 'OK';
    if (warningMax !== undefined && value < warningMax) return 'WARNING';
    return 'CRITICAL';
  }

  if (direction === 'min') {
    if (normalMin !== undefined && value > normalMin) return 'OK';
    if (warningMin !== undefined && value > warningMin) return 'WARNING';
    return 'CRITICAL';
  }

  return 'OK';
}
