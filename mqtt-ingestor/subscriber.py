import json
import os
import time
from datetime import datetime
from decimal import Decimal
from typing import Any

import paho.mqtt.client as mqtt
import pymysql


MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "biosafe/telemetry/+")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "nextpulse")
DB_USER = os.getenv("DB_USER", "nextpulse")
DB_PASSWORD = os.getenv("DB_PASSWORD", "nextpulse")


CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    device_id VARCHAR(20) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    reparto VARCHAR(80) NOT NULL,
    temperatura DECIMAL(8,2) NULL,
    vibrazione DECIMAL(8,3) NULL,
    livello_azoto DECIMAL(8,2) NULL,
    stato_dispositivo VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_device_id (device_id),
    INDEX idx_status (stato_dispositivo)
);
"""

INSERT_SQL = """
INSERT INTO sensor_readings (
    timestamp,
    device_id,
    device_type,
    reparto,
    temperatura,
    vibrazione,
    livello_azoto,
    stato_dispositivo
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
"""


def decimal_or_none(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    return Decimal(str(value))


def connect_db() -> pymysql.connections.Connection:
    while True:
        try:
            connection = pymysql.connect(
                host=DB_HOST,
                port=DB_PORT,
                user=DB_USER,
                password=DB_PASSWORD,
                database=DB_NAME,
                autocommit=True,
                cursorclass=pymysql.cursors.DictCursor,
            )
            with connection.cursor() as cursor:
                cursor.execute(CREATE_TABLE_SQL)
            print("Connected to MySQL.", flush=True)
            return connection
        except pymysql.MySQLError as error:
            print(f"MySQL unavailable: {error}. Retrying in 5s.", flush=True)
            time.sleep(5)


db_connection = connect_db()


def insert_reading(payload: dict[str, Any]) -> None:
    global db_connection
    values = (
        datetime.strptime(payload["timestamp"], "%Y-%m-%d %H:%M:%S"),
        payload["device_id"],
        payload["device_type"],
        payload["reparto"],
        decimal_or_none(payload.get("temperatura")),
        decimal_or_none(payload.get("vibrazione")),
        decimal_or_none(payload.get("livello_azoto")),
        payload["stato_dispositivo"],
    )

    try:
        with db_connection.cursor() as cursor:
            cursor.execute(INSERT_SQL, values)
    except pymysql.MySQLError:
        db_connection = connect_db()
        with db_connection.cursor() as cursor:
            cursor.execute(INSERT_SQL, values)


def on_connect(client: mqtt.Client, userdata: Any, flags: Any, reason_code: Any, properties: Any) -> None:
    print(f"Connected to MQTT with reason code {reason_code}. Subscribing to {MQTT_TOPIC}", flush=True)
    client.subscribe(MQTT_TOPIC, qos=1)


def on_message(client: mqtt.Client, userdata: Any, message: mqtt.MQTTMessage) -> None:
    try:
        payload = json.loads(message.payload.decode("utf-8"))
        insert_reading(payload)
    except Exception as error:
        print(f"Could not ingest MQTT message on {message.topic}: {error}", flush=True)


def main() -> None:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="nextpulse-mqtt-ingestor")
    client.on_connect = on_connect
    client.on_message = on_message

    while True:
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            break
        except OSError as error:
            print(f"MQTT broker unavailable: {error}. Retrying in 3s.", flush=True)
            time.sleep(3)

    client.loop_forever()


if __name__ == "__main__":
    main()
