import os
import pytest
from unittest.mock import patch, MagicMock


def test_anthropicApiKeyDefaultsToEmpty():
    """ANTHROPIC_API_KEY 환경변수가 없으면 빈 문자열로 설정된다."""
    with patch.dict(os.environ, {}, clear=True):
        import importlib
        import app.core.config as configModule
        importlib.reload(configModule)
        assert configModule.ANTHROPIC_API_KEY == ""


def test_anthropicApiKeyLoadsFromEnv():
    """ANTHROPIC_API_KEY 환경변수가 있으면 해당 값을 사용한다."""
    with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "test-key-123"}):
        import importlib
        import app.core.config as configModule
        importlib.reload(configModule)
        assert configModule.ANTHROPIC_API_KEY == "test-key-123"


def test_uploadDirConstant():
    """UPLOAD_DIR 상수가 올바르게 설정된다."""
    from app.core.config import UPLOAD_DIR
    assert UPLOAD_DIR == "uploads"


def test_framesDirConstant():
    """FRAMES_DIR 상수가 올바르게 설정된다."""
    from app.core.config import FRAMES_DIR
    assert FRAMES_DIR == "frames"


def test_getDatabaseUrlBuildsCorrectUrl():
    """getDatabaseUrl이 시크릿에서 올바른 DB URL을 조합한다."""
    mockSecret = {
        "host": "db.example.com",
        "port": 3306,
        "username": "admin",
        "password": "secret",
        "dbname": "process_maker",
    }
    with patch("app.core.config.getSecretValue", return_value=mockSecret):
        from app.core.config import getDatabaseUrl
        url = getDatabaseUrl()
        assert url == "mysql+pymysql://admin:secret@db.example.com:3306/process_maker"


def test_getDatabaseUrlUsesDefaultPort():
    """getDatabaseUrl이 port 미제공 시 기본값 3306을 사용한다."""
    mockSecret = {
        "host": "db.example.com",
        "username": "admin",
        "password": "secret",
    }
    with patch("app.core.config.getSecretValue", return_value=mockSecret):
        from app.core.config import getDatabaseUrl
        url = getDatabaseUrl()
        assert ":3306/" in url


def test_getDatabaseUrlUsesDefaultDbname():
    """getDatabaseUrl이 dbname 미제공 시 기본값 process_maker를 사용한다."""
    mockSecret = {
        "host": "db.example.com",
        "username": "admin",
        "password": "secret",
    }
    with patch("app.core.config.getSecretValue", return_value=mockSecret):
        from app.core.config import getDatabaseUrl
        url = getDatabaseUrl()
        assert url.endswith("/process_maker")
