import os
import pytest
from unittest.mock import patch, MagicMock


def test_getAnthropicApiKey_returnsKeyFromSecret():
    """getAnthropicApiKey가 AWS Secret에서 API 키를 반환한다."""
    mockSecret = {"ANTHROPIC_API_KEY": "sk-ant-test-key"}
    with patch("app.core.config.getSecretValue", return_value=mockSecret):
        from app.core.config import getAnthropicApiKey
        assert getAnthropicApiKey() == "sk-ant-test-key"


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
        "DB_HOST": "db.example.com",
        "DB_PORT": 3306,
        "DB_USER": "admin",
        "DB_PASSWORD": "secret",
        "DB_NAME": "process_maker",
    }
    with patch("app.core.config.getSecretValue", return_value=mockSecret):
        from app.core.config import getDatabaseUrl
        url = getDatabaseUrl()
        assert url == "mysql+pymysql://admin:secret@db.example.com:3306/process_maker"


def test_getDatabaseUrlUsesDefaultPort():
    """getDatabaseUrl이 port 미제공 시 기본값 3306을 사용한다."""
    mockSecret = {
        "DB_HOST": "db.example.com",
        "DB_USER": "admin",
        "DB_PASSWORD": "secret",
    }
    with patch("app.core.config.getSecretValue", return_value=mockSecret):
        from app.core.config import getDatabaseUrl
        url = getDatabaseUrl()
        assert ":3306/" in url


def test_getDatabaseUrlUsesDefaultDbname():
    """getDatabaseUrl이 dbname 미제공 시 기본값 process_maker를 사용한다."""
    mockSecret = {
        "DB_HOST": "db.example.com",
        "DB_USER": "admin",
        "DB_PASSWORD": "secret",
    }
    with patch("app.core.config.getSecretValue", return_value=mockSecret):
        from app.core.config import getDatabaseUrl
        url = getDatabaseUrl()
        assert url.endswith("/process_maker")
