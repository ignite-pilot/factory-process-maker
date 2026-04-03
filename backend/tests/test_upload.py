import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.core.database import getDb, Base

TEST_DB_URL = "sqlite://"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def overrideGetDb():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[getDb] = overrideGetDb
client = TestClient(app)


def makeVideoFile(name: str = "test.mp4") -> dict:
    return {"file": (name, io.BytesIO(b"fake video content"), "video/mp4")}


def test_uploadWithProcessName():
    resp = client.post(
        "/api/videos/upload",
        files=makeVideoFile(),
        data={"processName": "RG3 리어 범퍼 조립", "description": "리어 범퍼 조립 공정"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["processName"] == "RG3 리어 범퍼 조립"
    assert body["description"] == "리어 범퍼 조립 공정"


def test_uploadWithoutProcessNameUsesFileName():
    resp = client.post(
        "/api/videos/upload",
        files={"file": ("my_process.mp4", io.BytesIO(b"fake"), "video/mp4")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["processName"] == "my_process"


def test_uploadWithoutDescription():
    resp = client.post(
        "/api/videos/upload",
        files=makeVideoFile("no_desc.mp4"),
        data={"processName": "공정A"},
    )
    assert resp.status_code == 200
    assert resp.json()["description"] is None
