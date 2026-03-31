import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, getDb, initDb
from app.models.models import Video, AnalysisJob, WorkUnit, WorkUnitFrame  # noqa: F401

TEST_DB_URL = "sqlite:///./test.db"


@pytest.fixture(autouse=True)
def setupTestDb():
    engine = initDb(TEST_DB_URL)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


def test_uploadVideo_unsupportedFormat(client):
    response = client.post(
        "/api/videos/upload",
        files={"file": ("test.txt", b"data", "text/plain")},
    )
    assert response.status_code == 400


def test_listVideos_returnsEmptyList(client):
    response = client.get("/api/videos")
    assert response.status_code == 200
    assert response.json() == []


def test_getVideo_notFound(client):
    response = client.get("/api/videos/9999")
    assert response.status_code == 404


def test_startAnalysis_notFound(client):
    response = client.post("/api/videos/9999/analyze")
    assert response.status_code == 404


def test_getAnalysisStatus_notFound(client):
    response = client.get("/api/videos/9999/status")
    assert response.status_code == 404
