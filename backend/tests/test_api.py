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


def test_updateWorkUnit_notFound(client):
    response = client.put(
        "/api/work-units/9999",
        json={"title": "새 작업명"},
    )
    assert response.status_code == 404


def test_deleteWorkUnit_notFound(client):
    response = client.delete("/api/work-units/9999")
    assert response.status_code == 404


def test_reorderWorkUnits_returnsOk(client):
    response = client.post(
        "/api/work-units/reorder",
        json={"orderedIds": []},
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_createWorkUnit_videoNotFound(client):
    response = client.post(
        "/api/videos/9999/work-units",
        json={
            "sequence": 1,
            "title": "테스트 작업",
            "startTime": 0.0,
            "endTime": 10.0,
        },
    )
    assert response.status_code == 404


def test_getAnalysisStatus_includesProgressFields(client):
    import os, shutil
    os.makedirs("uploads", exist_ok=True)
    shutil.copy("tests/__init__.py", "uploads/test_progress.mp4")
    response = client.post(
        "/api/videos/upload",
        files={"file": ("test_progress.mp4", open("uploads/test_progress.mp4", "rb"), "video/mp4")},
    )
    videoId = response.json()["id"]
    client.post(f"/api/videos/{videoId}/analyze")
    response = client.get(f"/api/videos/{videoId}/status")
    assert response.status_code == 200
    data = response.json()
    assert "currentStep" in data
    assert "totalFrames" in data
    assert "processedFrames" in data
    assert "estimatedSecondsLeft" in data


def test_progressStore_clearedAfterCompletion():
    from app.api.videos import _progressStore
    _progressStore[9999] = {"currentStep": "analyzing", "totalFrames": 10, "processedFrames": 5, "analyzingStartedAt": None}
    assert 9999 in _progressStore
    _progressStore.pop(9999, None)
    assert 9999 not in _progressStore


def test_progressStore_etaIsNoneWhenNoFramesProcessed():
    import time
    from app.api.videos import _progressStore
    _progressStore[8888] = {
        "currentStep": "analyzing",
        "totalFrames": 100,
        "processedFrames": 0,
        "analyzingStartedAt": time.time(),
    }
    progress = _progressStore[8888]
    assert progress.get("processedFrames", 0) == 0
    _progressStore.pop(8888, None)
