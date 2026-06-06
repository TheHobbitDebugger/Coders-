import time

from flask import Flask
from flask_cors import CORS
from sqlalchemy.exc import OperationalError

from app.api.routes import api
from app.db import db
from app.settings import Settings


def wait_for_database(app: Flask) -> None:
    for attempt in range(1, Settings.DB_CONNECT_RETRIES + 1):
        try:
            with app.app_context():
                db.create_all()
            return
        except OperationalError as error:
            app.logger.warning(
                "Database unavailable, retry %s/%s in %.1fs: %s",
                attempt,
                Settings.DB_CONNECT_RETRIES,
                Settings.DB_CONNECT_RETRY_DELAY_SECONDS,
                error,
            )
            time.sleep(Settings.DB_CONNECT_RETRY_DELAY_SECONDS)

    with app.app_context():
        db.create_all()


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Settings)

    CORS(app, resources={r"/api/*": {"origins": Settings.CORS_ORIGINS}})
    db.init_app(app)
    app.register_blueprint(api)

    wait_for_database(app)

    return app
