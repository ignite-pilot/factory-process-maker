import os
from app.core.secretManager import getSecretValue

SECRET_NAME = "prod/ignite-pilot/mysql-realpilot"
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
UPLOAD_DIR = "uploads"
FRAMES_DIR = "frames"


def getDatabaseUrl() -> str:
    secret = getSecretValue(SECRET_NAME)
    host = secret["host"]
    port = secret.get("port", 3306)
    username = secret["username"]
    password = secret["password"]
    dbname = secret.get("dbname", "process_maker")
    return f"mysql+pymysql://{username}:{password}@{host}:{port}/{dbname}"
