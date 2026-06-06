# NextPulse Smart Monitoring

Skeleton avanzato per la challenge Cloud & IoT BioSafe Clinic.

## Architettura locale

```text
CSV simulator -> Mosquitto MQTT -> MQTT ingestor -> MySQL -> Flask API -> Angular dashboard
```

Per ora la dashboard grafica dati e KPI di base. La logica avanzata di anomalie e alert verra aggiunta dopo.

## Avvio locale con Docker Compose

```bash
docker compose up --build
```

Servizi principali:

- Dashboard Angular: http://localhost:4200
- Flask API: http://localhost:5000/api/kpis
- MySQL: localhost:3307
- MQTT broker locale: localhost:1883

Il simulatore legge il CSV originale in sola lettura e pubblica le righe sul topic `biosafe/telemetry/{device_id}`.

## Nota Windows sul percorso del progetto

La cartella corrente contiene `&` nel nome (`Cloud & IoT`). Alcuni script npm su Windows possono interpretare male quel carattere quando passano da `cmd.exe`.

Per sviluppo locale senza Docker, conviene spostare o copiare il progetto in una cartella senza `&`, per esempio `C:\dev\nextpulse-smart-monitoring`.

In alternativa, per buildare il frontend da questa cartella:

```powershell
cd frontend
npm.cmd install --no-audit --no-fund --ignore-scripts
node .\node_modules\@angular\cli\bin\ng.js build
```

Dentro Docker il problema non si presenta, perche il codice viene copiato in `/app`.

## Componenti

- `backend`: API Flask + SQLAlchemy.
- `frontend`: Angular + Chart.js, servito da Nginx.
- `mqtt-simulator`: publisher CSV -> MQTT.
- `mqtt-ingestor`: subscriber MQTT -> MySQL.
- `infra`: configurazione locale e note per Azure Container Apps.

## Migrazione verso Azure Container Apps

Target consigliato:

- Azure Container Registry per salvare le immagini.
- Azure Container Apps per `frontend`, `backend`, `mqtt-ingestor` e, se serve in demo, `mqtt-simulator`.
- Azure Database for MySQL Flexible Server come database gestito.
- Azure Event Grid MQTT Broker al posto di Mosquitto locale.

In cloud il simulatore puo essere eseguito come Container Apps Job, mentre backend, frontend e ingestor restano Container Apps sempre attive.
