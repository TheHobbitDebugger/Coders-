from flask import Blueprint, jsonify, request
from sqlalchemy import case, func

from app.db import db
from app.models import SensorReading

api = Blueprint("api", __name__)


@api.get("/health")
def health():
    return {"status": "ok"}


@api.get("/api/readings")
def readings():
    query = SensorReading.query
    device_id = request.args.get("device_id")
    status = request.args.get("status")
    limit = min(int(request.args.get("limit", 200)), 2000)

    if device_id:
        query = query.filter(SensorReading.device_id == device_id)
    if status:
        query = query.filter(SensorReading.stato_dispositivo == status)

    rows = query.order_by(SensorReading.timestamp.desc()).limit(limit).all()
    return jsonify([row.to_dict() for row in rows])


@api.get("/api/devices")
def devices():
    rows = (
        db.session.query(
            SensorReading.device_id,
            SensorReading.device_type,
            SensorReading.reparto,
            func.count(SensorReading.id).label("reading_count"),
            func.max(SensorReading.timestamp).label("last_seen"),
            func.sum(case((SensorReading.stato_dispositivo == "WARNING", 1), else_=0)).label(
                "warning_count"
            ),
            func.sum(case((SensorReading.stato_dispositivo == "CRITICAL", 1), else_=0)).label(
                "critical_count"
            ),
        )
        .group_by(SensorReading.device_id, SensorReading.device_type, SensorReading.reparto)
        .order_by(SensorReading.device_id)
        .all()
    )

    return jsonify(
        [
            {
                "device_id": row.device_id,
                "device_type": row.device_type,
                "reparto": row.reparto,
                "reading_count": int(row.reading_count),
                "last_seen": row.last_seen.isoformat(sep=" ") if row.last_seen else None,
                "warning_count": int(row.warning_count or 0),
                "critical_count": int(row.critical_count or 0),
            }
            for row in rows
        ]
    )


@api.get("/api/kpis")
def kpis():
    total = db.session.query(func.count(SensorReading.id)).scalar() or 0
    devices_count = db.session.query(func.count(func.distinct(SensorReading.device_id))).scalar() or 0
    warning_count = (
        db.session.query(func.count(SensorReading.id))
        .filter(SensorReading.stato_dispositivo == "WARNING")
        .scalar()
        or 0
    )
    critical_count = (
        db.session.query(func.count(SensorReading.id))
        .filter(SensorReading.stato_dispositivo == "CRITICAL")
        .scalar()
        or 0
    )
    last_seen = db.session.query(func.max(SensorReading.timestamp)).scalar()

    return jsonify(
        {
            "total_readings": int(total),
            "devices_count": int(devices_count),
            "warning_count": int(warning_count),
            "critical_count": int(critical_count),
            "last_seen": last_seen.isoformat(sep=" ") if last_seen else None,
        }
    )


@api.get("/api/timeseries")
def timeseries():
    device_id = request.args.get("device_id")
    metric = request.args.get("metric", "temperatura")
    limit = min(int(request.args.get("limit", 300)), 1000)

    allowed_metrics = {
        "temperatura": SensorReading.temperatura,
        "vibrazione": SensorReading.vibrazione,
        "livello_azoto": SensorReading.livello_azoto,
    }
    metric_column = allowed_metrics.get(metric)
    if metric_column is None:
        return jsonify({"error": "Unsupported metric"}), 400

    query = db.session.query(SensorReading.timestamp, metric_column).filter(metric_column.isnot(None))
    if device_id:
        query = query.filter(SensorReading.device_id == device_id)

    rows = query.order_by(SensorReading.timestamp.desc()).limit(limit).all()
    rows = list(reversed(rows))

    return jsonify(
        [
            {
                "timestamp": row[0].isoformat(sep=" "),
                "value": float(row[1]) if row[1] is not None else None,
            }
            for row in rows
        ]
    )
