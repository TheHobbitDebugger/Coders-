import os


class Settings:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "nextpulse")
    DB_USER = os.getenv("DB_USER", "nextpulse")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "nextpulse")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    DB_CONNECT_RETRIES = int(os.getenv("DB_CONNECT_RETRIES", "30"))
    DB_CONNECT_RETRY_DELAY_SECONDS = float(os.getenv("DB_CONNECT_RETRY_DELAY_SECONDS", "2"))
