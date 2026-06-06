from app.db import db


class SensorReading(db.Model):
    __tablename__ = "sensor_readings"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    device_id = db.Column(db.String(20), nullable=False, index=True)
    device_type = db.Column(db.String(50), nullable=False, index=True)
    reparto = db.Column(db.String(80), nullable=False, index=True)
    temperatura = db.Column(db.Numeric(8, 2), nullable=True)
    vibrazione = db.Column(db.Numeric(8, 3), nullable=True)
    livello_azoto = db.Column(db.Numeric(8, 2), nullable=True)
    stato_dispositivo = db.Column(db.String(20), nullable=False, index=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(sep=" "),
            "device_id": self.device_id,
            "device_type": self.device_type,
            "reparto": self.reparto,
            "temperatura": float(self.temperatura) if self.temperatura is not None else None,
            "vibrazione": float(self.vibrazione) if self.vibrazione is not None else None,
            "livello_azoto": float(self.livello_azoto) if self.livello_azoto is not None else None,
            "stato_dispositivo": self.stato_dispositivo,
        }
