import csv
import io
import json
import os
import time
from typing import Any

import paho.mqtt.client as mqtt


MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC_PREFIX = os.getenv("MQTT_TOPIC_PREFIX", "biosafe/telemetry")
CSV_PATH = os.getenv("CSV_PATH", "/data/sensors.csv")
PUBLISH_INTERVAL_SECONDS = float(os.getenv("PUBLISH_INTERVAL_SECONDS", "0.1"))
START_DELAY_SECONDS = float(os.getenv("START_DELAY_SECONDS", "0"))
LOOP_DATASET = os.getenv("LOOP_DATASET", "false").lower() == "true"


def parse_optional_float(value: str | None) -> float | None:
    if value is None or value == "":
        return None
    return float(value)


def load_rows() -> list[dict[str, Any]]:
    with open(CSV_PATH, "r", encoding="utf-8-sig") as file:
        normalized = "\n".join(line.strip().strip('"') for line in file if line.strip())

    reader = csv.DictReader(io.StringIO(normalized))
    rows: list[dict[str, Any]] = []
    for row in reader:
        rows.append(
            {
                "timestamp": row["timestamp"],
                "device_id": row["device_id"],
                "device_type": row["device_type"],
                "reparto": row["reparto"],
                "temperatura": parse_optional_float(row.get("temperatura")),
                "vibrazione": parse_optional_float(row.get("vibrazione")),
                "livello_azoto": parse_optional_float(row.get("livello_azoto")),
                "stato_dispositivo": row["stato_dispositivo"],
            }
        )
    return rows


def connect_client() -> mqtt.Client:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="nextpulse-csv-simulator")
    while True:
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            client.loop_start()
            return client
        except OSError as error:
            print(f"MQTT broker unavailable: {error}. Retrying in 3s.", flush=True)
            time.sleep(3)


def main() -> None:
    rows = load_rows()
    client = connect_client()
    print(f"Publishing {len(rows)} CSV readings to {MQTT_HOST}:{MQTT_PORT}", flush=True)
    if START_DELAY_SECONDS > 0:
        time.sleep(START_DELAY_SECONDS)

    while True:
        for row in rows:
            topic = f"{MQTT_TOPIC_PREFIX}/{row['device_id']}"
            payload = json.dumps(row, separators=(",", ":"))
            client.publish(topic, payload=payload, qos=1)
            time.sleep(PUBLISH_INTERVAL_SECONDS)

        if not LOOP_DATASET:
            break

    client.loop_stop()
    client.disconnect()
    print("CSV simulation completed.", flush=True)


if __name__ == "__main__":
    main()
