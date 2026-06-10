# NextPulse Smart Monitoring

#### Video Demo: <URL HERE>
#### Description: Cloud-native and IoT med-tech monitoring and analytics Full-stack web app

NextPulse Smart Monitoring is a hackathon project for the Cloud & IoT BioSafe Clinic challenge. It simulates medical-lab sensor telemetry, sends it through MQTT, persists it in MySQL, exposes it through a Flask API, and displays operational KPIs, charts, alerts, and predictive analytics in an Angular dashboard.

## Architecture

```text
CSV sensor dataset
  -> MQTT simulator
  -> Mosquitto MQTT broker
  -> MQTT ingestor
  -> MySQL database
  -> Flask API
  -> Angular dashboard
```

The local environment is fully containerized with Docker Compose:

- `mqtt-simulator` reads the provided CSV dataset and publishes each row to `biosafe/telemetry/{device_id}`.
- `mqtt` runs an Eclipse Mosquitto broker on port `1883`.
- `mqtt-ingestor` subscribes to the telemetry topic, writes readings into MySQL, and can trigger Azure Communication Services email alerts for critical readings.
- `mysql` stores the `sensor_readings` table.
- `backend` exposes REST endpoints for readings, devices, KPIs, time series, and analytics.
- `frontend` provides the Angular dashboard with filters, charts, alerts, device details, dark mode, and analytics panels.

## Local Startup

```bash
docker compose up --build
```

Main local services:

- Angular dashboard: http://localhost:4200
- Flask API health check: http://localhost:5000/health
- Flask KPI endpoint: http://localhost:5000/api/kpis
- MySQL: `localhost:3307`
- MQTT broker: `localhost:1883`

The simulator mounts the source CSV file read-only and publishes the dataset once by default. Set `LOOP_DATASET=true` in `docker-compose.yml` if you want continuous replay.

## API Endpoints

- `GET /health` returns backend health status.
- `GET /api/readings` returns recent sensor readings with optional `device_id`, `status`, `from`, `to`, and `limit` filters.
- `GET /api/devices` returns one summary row per device, including warning and critical counts.
- `GET /api/kpis` returns total readings, device count, warning count, critical count, and latest timestamp.
- `GET /api/timeseries` returns chart-ready points for `temperatura`, `vibrazione`, or `livello_azoto`.
- `GET /api/analytics` returns higher-level analytics such as top problematic devices, risk scores, trends, suspicious sensors, recurring anomalies, and time-to-critical estimates.

## Windows Path Note

The current folder name contains `&` (`Cloud & IoT`). Some Windows npm scripts can misinterpret that character when they pass through `cmd.exe`.

For local frontend development without Docker, it is safer to move or copy the project to a path without `&`, for example:

```text
C:\dev\nextpulse-smart-monitoring
```

Alternatively, from this folder you can build the frontend with:

```powershell
cd frontend
npm.cmd install --no-audit --no-fund --ignore-scripts
node .\node_modules\@angular\cli\bin\ng.js build
```

Inside Docker this path issue does not apply because the code is copied to `/app`.

## Azure Container Apps Migration

Recommended cloud target:

- Azure Container Registry for built images.
- Azure Container Apps for `frontend`, `backend`, and `mqtt-ingestor`.
- Azure Container Apps Job for `mqtt-simulator` when replaying the CSV in demos.
- Azure Database for MySQL Flexible Server for managed persistence.
- Azure Event Grid MQTT Broker instead of the local Mosquitto container.
- Azure Communication Services for critical email notifications from the ingestor.

## Project Files

### Root

- `README.md`: Project documentation, architecture overview, startup notes, API description, and file inventory.
- `docker-compose.yml`: Local orchestration for MySQL, Mosquitto, Flask backend, Angular frontend, MQTT ingestor, and CSV simulator.
- `NEXTPULSE_Cloud&IoT_Allegato_Dataset_Sensori.csv`: Source sensor dataset used by the simulator. Columns include timestamp, device id, device type, department, temperature, vibration, nitrogen level, and device status.
- `NEXTPULSE_Cloud&IoT_Allegato_Dataset_Sensori.xlsx`: Spreadsheet version of the same challenge sensor dataset.

### Workshop And Challenge Material

- `wiki/NEXTPULSE_Cloud&IoT_Workshop.pptx`: Workshop presentation material for the challenge.
- `wiki/NEXTPULSE_Cloud&IoT_Challenge_Traccia.pptx`: Main challenge brief.
- `wiki/NEXTPULSE_Cloud&IoT_Challenge_Allegato_Soglie.pptx`: Threshold appendix describing normal, warning, and critical ranges.
- `wiki/NEXTPULSE_Cloud&IoT_Challenge_Allegato_Anomalie.pptx`: Anomaly appendix describing expected abnormal patterns.

### Infrastructure

- `infra/mosquitto.conf`: Local Mosquitto configuration. It listens on port `1883`, allows anonymous access, and disables persistence.
- `infra/azure-container-apps/README.md`: Notes for deploying the stack to Azure Container Apps and replacing local services with Azure managed services.

### Backend

- `backend/Dockerfile`: Builds the Flask API container and runs it with Gunicorn on port `5000`.
- `backend/requirements.txt`: Python dependencies for Flask, CORS, SQLAlchemy, PyMySQL, cryptography, Gunicorn, and dotenv support.
- `backend/app/__init__.py`: Flask application factory. It configures CORS, initializes SQLAlchemy, registers API routes, waits for MySQL, and creates tables.
- `backend/app/settings.py`: Environment-driven backend configuration for database connection, CORS origins, and database retry behavior.
- `backend/app/db.py`: Shared SQLAlchemy database object.
- `backend/app/api/__init__.py`: API package marker.
- `backend/app/api/routes.py`: Flask routes for health, readings, device summaries, KPIs, time series, and analytics. It also applies common filters such as device, department, and date range.
- `backend/app/models/__init__.py`: Exposes the `SensorReading` model from the models package.
- `backend/app/models/sensor_reading.py`: SQLAlchemy model for the `sensor_readings` table and JSON serialization logic.
- `backend/app/services/__init__.py`: Services package marker.
- `backend/app/services/analytics.py`: Analytics engine for thresholds, deviations, device risk scores, trends, suspicious sensors, recurring anomalies, critical durations, and predictive time-to-critical calculations.

### MQTT Ingestor

- `mqtt-ingestor/Dockerfile`: Builds the Python subscriber container and runs `subscriber.py`.
- `mqtt-ingestor/requirements.txt`: Python dependencies for MQTT, MySQL, dotenv, cryptography, and Azure Communication Services email.
- `mqtt-ingestor/subscriber.py`: Subscribes to MQTT telemetry, creates the MySQL table if needed, inserts each reading, reconnects on database or broker failures, and contains the critical-alert email integration hook.

### MQTT Simulator

- `mqtt-simulator/Dockerfile`: Builds the Python CSV publisher container and runs `csv_publisher.py`.
- `mqtt-simulator/requirements.txt`: Python dependencies for MQTT publishing and dotenv support.
- `mqtt-simulator/csv_publisher.py`: Reads the CSV dataset, normalizes values, converts optional numeric fields, publishes each reading as JSON to MQTT, and optionally loops the dataset.

### Frontend Build And Deployment

- `frontend/Dockerfile`: Multi-stage build. It compiles the Angular app with Node and serves the production output with Nginx.
- `frontend/nginx.conf.template`: Nginx template for serving the Angular single-page app and proxying `/api/` requests to the backend.
- `frontend/package.json`: Angular project metadata, npm scripts, runtime dependencies, and build dependencies.
- `frontend/package-lock.json`: Locked npm dependency graph for reproducible installs.
- `frontend/angular.json`: Angular CLI workspace configuration for build, serve, assets, styles, service worker, budgets, and development settings.
- `frontend/tsconfig.json`: Base TypeScript compiler and Angular compiler settings.
- `frontend/tsconfig.app.json`: Application-specific TypeScript configuration that points to `src/main.ts`.
- `frontend/tailwind.config.js`: Tailwind CSS configuration, including class-based dark mode and content scanning paths.
- `frontend/ngsw-config.json`: Angular service worker configuration for caching app shell files and static assets.

### Frontend Public Assets

- `frontend/public/manifest.webmanifest`: Progressive web app manifest with app name, colors, display mode, start URL, and icon definitions.
- `frontend/public/icons/icon-72x72.png`: PWA icon at 72 by 72 pixels.
- `frontend/public/icons/icon-96x96.png`: PWA icon at 96 by 96 pixels.
- `frontend/public/icons/icon-128x128.png`: PWA icon at 128 by 128 pixels.
- `frontend/public/icons/icon-144x144.png`: PWA icon at 144 by 144 pixels.
- `frontend/public/icons/icon-152x152.png`: PWA icon at 152 by 152 pixels.
- `frontend/public/icons/icon-192x192.png`: PWA icon at 192 by 192 pixels.
- `frontend/public/icons/icon-384x384.png`: PWA icon at 384 by 384 pixels.
- `frontend/public/icons/icon-512x512.png`: PWA icon at 512 by 512 pixels.

### Frontend Source

- `frontend/src/index.html`: Angular host HTML document with viewport metadata, manifest link, theme color, and `<app-root>`.
- `frontend/src/main.ts`: Angular bootstrap entry point. It provides HTTP, routing, and the service worker.
- `frontend/src/styles.css`: Global Tailwind imports and base light/dark theme styles.
- `frontend/src/proxy.conf.json`: Angular dev-server proxy that forwards `/api` requests to the backend service.
- `frontend/src/favicon.ico`: Browser favicon for the Angular app.
- `frontend/src/app/app.component.ts`: Root Angular component. It loads top-level KPIs, controls the app theme, exposes refresh state, and hosts routed content.
- `frontend/src/app/app.component.html`: Root layout with header, KPI cards, theme toggle, refresh button, router outlet, and alert toast markup.
- `frontend/src/app/app.routes.ts`: Route table for the dashboard, the readings route, and fallback redirect.
- `frontend/src/app/dashboard/dashboard.component.ts`: Main dashboard logic for device and department filters, date picking, chart rendering with Chart.js, device details, alert generation, analytics loading, threshold evaluation, and action plans.
- `frontend/src/app/dashboard/dashboard.component.html`: Dashboard view for filters, tabs, sensor chart, device list, device details, readings table, alert history, and analytics panels.
- `frontend/src/app/letture/letture.component.ts`: Readings component with client-side filters, sorting, pagination, device type labels, and row severity classes.
- `frontend/src/app/letture/letture.component.html`: Readings route view that redirects the user back to the dashboard readings tab.
- `frontend/src/app/services/monitoring-api.service.ts`: Angular HTTP service and TypeScript interfaces for KPIs, devices, readings, time series, and analytics responses.
- `frontend/src/app/services/sensor-state.service.ts`: Signal-based client state service for latest device readings and recent alerts.
- `frontend/src/app/components/status-card.components.ts`: Standalone reusable status card component for a device reading, including severity styling and click output.
