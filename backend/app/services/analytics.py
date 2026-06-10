from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from statistics import mean, pstdev
from typing import Any

from app.models import SensorReading


PARAMETERS = ("temperatura", "vibrazione", "livello_azoto")

NORMAL_RANGES = {
    "incubatore": {
        "temperatura": (36.0, 38.0),
        "vibrazione": (None, 0.6),
    },
    "cella_coltura": {
        "temperatura": (36.0, 38.0),
        "vibrazione": (None, 0.4),
    },
    "banca_criogenica": {
        "temperatura": (None, -194.0),
        "vibrazione": (None, 0.5),
        "livello_azoto": (40.0, None),
    },
    "hvac": {
        "temperatura": (19.0, 23.0),
        "vibrazione": (None, 1.2),
    },
}

CRITICAL_THRESHOLDS = {
    "incubatore": {
        "temperatura": {"low": 35.0, "high": 39.0},
        "vibrazione": {"high": 1.0},
    },
    "cella_coltura": {
        "temperatura": {"low": 35.0, "high": 39.0},
        "vibrazione": {"high": 0.8},
    },
    "banca_criogenica": {
        "temperatura": {"high": -190.0},
        "vibrazione": {"high": 1.0},
        "livello_azoto": {"low": 25.0},
    },
    "hvac": {
        "temperatura": {"low": 18.0, "high": 25.0},
        "vibrazione": {"high": 2.0},
    },
}


def as_float(value: Decimal | float | int | None) -> float | None:
    if value is None:
        return None
    return float(value)


def get_value(reading: SensorReading, parameter: str) -> float | None:
    return as_float(getattr(reading, parameter))


def label_parameter(parameter: str) -> str:
    return {
        "temperatura": "Temperatura",
        "vibrazione": "Vibrazione",
        "livello_azoto": "Livello Azoto",
    }.get(parameter, parameter)


def threshold_deviation(device_type: str, parameter: str, value: float | None) -> float | None:
    if value is None:
        return None
    ranges = NORMAL_RANGES.get(device_type, {})
    low, high = ranges.get(parameter, (None, None))
    if low is not None and value < low:
        return low - value
    if high is not None and value > high:
        return value - high
    return 0.0


def linear_slope_per_hour(points: list[tuple[datetime, float]]) -> float | None:
    if len(points) < 2:
        return None
    start = points[0][0]
    xs = [(timestamp - start).total_seconds() / 3600 for timestamp, _ in points]
    ys = [value for _, value in points]
    x_mean = mean(xs)
    y_mean = mean(ys)
    denominator = sum((x - x_mean) ** 2 for x in xs)
    if denominator == 0:
        return None
    return sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys)) / denominator


def trend_direction(slope: float | None, parameter: str) -> str:
    if slope is None or abs(slope) < 0.001:
        return "stabile"
    if parameter == "livello_azoto":
        return "in calo" if slope < 0 else "in crescita"
    return "in aumento" if slope > 0 else "in diminuzione"


def time_to_critical(
    device_type: str,
    parameter: str,
    current_value: float | None,
    slope: float | None,
) -> dict[str, Any]:
    if current_value is None or slope is None or abs(slope) < 0.001:
        return {"hours": None, "status": "stabile", "threshold": None}

    thresholds = CRITICAL_THRESHOLDS.get(device_type, {}).get(parameter, {})
    threshold = None
    hours = None

    if slope > 0 and "high" in thresholds:
        threshold = thresholds["high"]
        hours = max((threshold - current_value) / slope, 0)
    elif slope < 0 and "low" in thresholds:
        threshold = thresholds["low"]
        hours = max((current_value - threshold) / abs(slope), 0)

    if threshold is None or hours is None or not math.isfinite(hours):
        return {"hours": None, "status": "non direzionato verso soglia", "threshold": None}

    return {
        "hours": round(hours, 1),
        "status": "soglia gia' superata" if hours == 0 else "verso soglia critica",
        "threshold": threshold,
    }


def severity_label(score: float) -> str:
    if score >= 70:
        return "CRITICAL"
    if score >= 35:
        return "WARNING"
    return "OK"


def build_analytics(readings: list[SensorReading]) -> dict[str, Any]:
    readings = sorted(readings, key=lambda row: (row.device_id, row.timestamp))
    by_device: dict[str, list[SensorReading]] = defaultdict(list)
    by_reparto: dict[str, list[SensorReading]] = defaultdict(list)
    parameter_values: dict[str, list[float]] = defaultdict(list)
    parameter_deviations: dict[str, list[float]] = defaultdict(list)
    anomalies_by_hour = {hour: 0 for hour in range(24)}

    for row in readings:
        by_device[row.device_id].append(row)
        by_reparto[row.reparto].append(row)
        status = row.stato_dispositivo.upper()
        if status in {"WARNING", "CRITICAL"}:
            anomalies_by_hour[row.timestamp.hour] += 1

        for parameter in PARAMETERS:
            value = get_value(row, parameter)
            if value is None:
                continue
            parameter_values[parameter].append(value)
            deviation = threshold_deviation(row.device_type, parameter, value)
            if deviation is not None and deviation > 0:
                parameter_deviations[parameter].append(deviation)

    top_problem_devices = []
    device_risk_scores = []
    temperature_trends = []
    nitrogen_time_to_critical = []
    suspicious_sensors = []
    sensor_stability = []
    recurring_groups: dict[tuple[str, str, int], set[str]] = defaultdict(set)

    for device_id, rows in by_device.items():
        total = len(rows)
        warning_count = sum(1 for row in rows if row.stato_dispositivo.upper() == "WARNING")
        critical_count = sum(1 for row in rows if row.stato_dispositivo.upper() == "CRITICAL")
        problem_score = critical_count * 3 + warning_count
        device_type = rows[-1].device_type
        reparto = rows[-1].reparto

        top_problem_devices.append(
            {
                "device_id": device_id,
                "device_type": device_type,
                "reparto": reparto,
                "warning_count": warning_count,
                "critical_count": critical_count,
                "score": problem_score,
            }
        )

        max_instability = 0.0
        has_suspicious_signal = False

        for parameter in PARAMETERS:
            points = [
                (row.timestamp, get_value(row, parameter))
                for row in rows
                if get_value(row, parameter) is not None
            ]
            numeric_points = [(timestamp, value) for timestamp, value in points if value is not None]
            if len(numeric_points) < 2:
                continue

            values = [value for _, value in numeric_points]
            stddev = pstdev(values)
            avg_value = mean(values)
            unique_values = len(set(round(value, 4) for value in values))
            zero_ratio = sum(1 for value in values if value == 0) / len(values)
            instability = stddev / max(abs(avg_value), 1)
            max_instability = max(max_instability, instability)

            suspicious = len(values) >= 20 and (stddev < 0.005 or unique_values <= 2 or zero_ratio > 0.85)
            has_suspicious_signal = has_suspicious_signal or suspicious
            sensor_stability.append(
                {
                    "device_id": device_id,
                    "parameter": label_parameter(parameter),
                    "average": round(avg_value, 3),
                    "stddev": round(stddev, 4),
                    "sample_count": len(values),
                    "status": "sospetto" if suspicious else "variabile",
                }
            )
            if suspicious:
                suspicious_sensors.append(
                    {
                        "device_id": device_id,
                        "parameter": label_parameter(parameter),
                        "reason": "valori troppo stabili o ripetuti",
                        "stddev": round(stddev, 4),
                        "zero_ratio": round(zero_ratio, 2),
                    }
                )

            slope = linear_slope_per_hour(numeric_points[-96:])
            latest_value = numeric_points[-1][1]
            ttc = time_to_critical(device_type, parameter, latest_value, slope)

            if parameter == "temperatura":
                temperature_trends.append(
                    {
                        "device_id": device_id,
                        "slope_per_hour": round(slope or 0, 4),
                        "direction": trend_direction(slope, parameter),
                        "latest_value": round(latest_value, 2),
                        "time_to_critical_hours": ttc["hours"],
                    }
                )
            if parameter == "livello_azoto":
                nitrogen_time_to_critical.append(
                    {
                        "device_id": device_id,
                        "slope_per_hour": round(slope or 0, 4),
                        "direction": trend_direction(slope, parameter),
                        "latest_value": round(latest_value, 2),
                        "critical_threshold": ttc["threshold"],
                        "time_to_critical_hours": ttc["hours"],
                        "status": ttc["status"],
                    }
                )

        anomaly_rate = (warning_count + critical_count) / total if total else 0
        critical_rate = critical_count / total if total else 0
        risk_score = min(
            100,
            round((anomaly_rate * 100) + (critical_rate * 220) + (max_instability * 80) + (15 if has_suspicious_signal else 0), 1),
        )
        device_risk_scores.append(
            {
                "device_id": device_id,
                "device_type": device_type,
                "reparto": reparto,
                "score": risk_score,
                "severity": severity_label(risk_score),
                "warning_count": warning_count,
                "critical_count": critical_count,
            }
        )

        for row in rows:
            status = row.stato_dispositivo.upper()
            if status in {"WARNING", "CRITICAL"}:
                recurring_groups[(device_id, status, row.timestamp.hour)].add(row.timestamp.date().isoformat())

    reparto_scores = []
    for reparto, rows in by_reparto.items():
        warning_count = sum(1 for row in rows if row.stato_dispositivo.upper() == "WARNING")
        critical_count = sum(1 for row in rows if row.stato_dispositivo.upper() == "CRITICAL")
        reparto_scores.append(
            {
                "reparto": reparto,
                "warning_count": warning_count,
                "critical_count": critical_count,
                "score": critical_count * 3 + warning_count,
            }
        )

    critical_durations = []
    for rows in by_device.values():
        current_start = None
        current_end = None
        for row in rows:
            if row.stato_dispositivo.upper() == "CRITICAL":
                if current_start is None:
                    current_start = row.timestamp
                current_end = row.timestamp
            elif current_start is not None and current_end is not None:
                critical_durations.append(((current_end - current_start).total_seconds() / 60) + 30)
                current_start = None
                current_end = None
        if current_start is not None and current_end is not None:
            critical_durations.append(((current_end - current_start).total_seconds() / 60) + 30)

    most_unstable_parameter = None
    if parameter_values:
        most_unstable_key = max(parameter_values, key=lambda key: pstdev(parameter_values[key]) if len(parameter_values[key]) > 1 else 0)
        values = parameter_values[most_unstable_key]
        most_unstable_parameter = {
            "parameter": label_parameter(most_unstable_key),
            "stddev": round(pstdev(values), 4) if len(values) > 1 else 0,
            "sample_count": len(values),
        }

    average_threshold_deviation = {
        "by_parameter": [
            {
                "parameter": label_parameter(parameter),
                "average_deviation": round(mean(values), 3),
                "sample_count": len(values),
            }
            for parameter, values in sorted(parameter_deviations.items())
            if values
        ]
    }

    recurring_anomalies = [
        {
            "device_id": device_id,
            "severity": status,
            "hour": hour,
            "days_count": len(days),
            "pattern": f"{status} ricorrente intorno alle {hour:02d}:00",
        }
        for (device_id, status, hour), days in recurring_groups.items()
        if len(days) >= 2
    ]

    hvac_rows = by_device.get("HVAC-01", [])
    hvac_warning = sum(1 for row in hvac_rows if row.stato_dispositivo.upper() == "WARNING")
    hvac_critical = sum(1 for row in hvac_rows if row.stato_dispositivo.upper() == "CRITICAL")
    hvac_vib_values = [get_value(row, "vibrazione") for row in hvac_rows if get_value(row, "vibrazione") is not None]
    hvac_vib_slope = linear_slope_per_hour(
        [(row.timestamp, get_value(row, "vibrazione")) for row in hvac_rows if get_value(row, "vibrazione") is not None][-96:]
    )
    hvac_probability = min(
        100,
        round(
            ((hvac_warning + hvac_critical * 3) / max(len(hvac_rows), 1) * 100)
            + (max(hvac_vib_values or [0]) / 2.0 * 30)
            + (15 if hvac_vib_slope and hvac_vib_slope > 0 else 0),
            1,
        ),
    )

    top_risk = sorted(device_risk_scores, key=lambda item: item["score"], reverse=True)
    sorted_nitrogen = sorted(
        nitrogen_time_to_critical,
        key=lambda item: item["time_to_critical_hours"] if item["time_to_critical_hours"] is not None else 999999,
    )

    return {
        "top_problem_devices": sorted(top_problem_devices, key=lambda item: item["score"], reverse=True)[:3],
        "most_unstable_parameter": most_unstable_parameter,
        "riskiest_reparto": max(reparto_scores, key=lambda item: item["score"], default=None),
        "average_critical_duration_minutes": round(mean(critical_durations), 1) if critical_durations else None,
        "anomalies_by_hour": [
            {"hour": hour, "count": count}
            for hour, count in sorted(anomalies_by_hour.items())
            if count > 0
        ],
        "average_threshold_deviation": average_threshold_deviation,
        "sensor_stability": sorted(sensor_stability, key=lambda item: item["stddev"])[:8],
        "predictive": {
            "device_risk_scores": top_risk,
            "temperature_trends": sorted(temperature_trends, key=lambda item: abs(item["slope_per_hour"]), reverse=True)[:8],
            "nitrogen_time_to_critical": sorted_nitrogen,
            "hvac_failure_probability": {
                "device_id": "HVAC-01",
                "probability": hvac_probability if hvac_rows else None,
                "severity": severity_label(hvac_probability) if hvac_rows else "N/A",
                "max_vibration": round(max(hvac_vib_values), 3) if hvac_vib_values else None,
                "vibration_slope_per_hour": round(hvac_vib_slope or 0, 4) if hvac_rows else None,
            },
            "suspicious_sensors": suspicious_sensors[:8],
            "recurring_anomalies": sorted(recurring_anomalies, key=lambda item: item["days_count"], reverse=True)[:8],
        },
    }
