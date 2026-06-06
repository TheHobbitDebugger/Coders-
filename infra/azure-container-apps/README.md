# Azure Container Apps Notes

Questa cartella raccogliera gli script e i manifest per il deploy su Azure Container Apps.

## Strategia

1. Build delle immagini container.
2. Push su Azure Container Registry.
3. Creazione di un Container Apps Environment.
4. Deploy di:
   - `frontend`, esposto pubblicamente.
   - `backend`, raggiungibile dal frontend.
   - `mqtt-ingestor`, senza esposizione pubblica.
   - `mqtt-simulator`, preferibilmente come job per replay del CSV.
5. Collegamento a Azure Database for MySQL Flexible Server.
6. Sostituzione del broker locale Mosquitto con Azure Event Grid MQTT Broker.

## Variabili d'ambiente principali

Backend e ingestor:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

MQTT simulator e ingestor:

```text
MQTT_HOST
MQTT_PORT
MQTT_TOPIC
MQTT_TOPIC_PREFIX
```

Frontend:

```text
BACKEND_URL
```

Per Event Grid MQTT serviranno anche autenticazione, certificati o credenziali client in base alla configurazione scelta.
