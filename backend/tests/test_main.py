import pytest
from unittest.mock import patch, MagicMock
import os


@pytest.fixture
def testClient():
    """FastAPI 테스트 클라이언트를 반환한다."""
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)


def test_appTitleIsProcessMakerApi():
    """FastAPI 앱 타이틀이 올바르게 설정된다."""
    from app.main import app
    assert app.title == "Process Maker API"


def test_uploadsDirectoryCreatedOnStartup():
    """앱 임포트 시 uploads 디렉토리가 생성된다."""
    from app.core.config import UPLOAD_DIR
    assert os.path.exists(UPLOAD_DIR)


def test_framesDirectoryCreatedOnStartup():
    """앱 임포트 시 frames 디렉토리가 생성된다."""
    from app.core.config import FRAMES_DIR
    assert os.path.exists(FRAMES_DIR)


def test_corsMiddlewareAllowsLocalhostOrigin(testClient):
    """CORS 미들웨어가 localhost:5173 출처를 허용한다."""
    response = testClient.options(
        "/",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
