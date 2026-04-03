import os
from app.core.secretManager import getSecretValue

SECRET_NAME = "prod/ignite-pilot/mysql-realpilot"
CLAUDE_SECRET_NAME = "prod/ignite-pilot/claude"
UPLOAD_DIR = "uploads"
FRAMES_DIR = "frames"


def getAnthropicApiKey() -> str:
    secret = getSecretValue(CLAUDE_SECRET_NAME)
    return secret["ANTHROPIC_API_KEY"]


def getDatabaseUrl() -> str:
    secret = getSecretValue(SECRET_NAME)
    host = secret["DB_HOST"]
    port = secret.get("DB_PORT", 3306)
    username = secret["DB_USER"]
    password = secret["DB_PASSWORD"]
    dbname = secret.get("DB_NAME", "factory_process_maker")
    return f"mysql+pymysql://{username}:{password}@{host}:{port}/{dbname}"
