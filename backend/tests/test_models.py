import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.models import Video, AnalysisJob, WorkUnit, WorkUnitFrame


@pytest.fixture
def testEngine():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def testDb(testEngine):
    SessionLocal = sessionmaker(bind=testEngine)
    db = SessionLocal()
    yield db
    db.close()


def test_videoTableExists(testEngine):
    inspector = inspect(testEngine)
    assert "videos" in inspector.get_table_names()


def test_analysisJobTableExists(testEngine):
    inspector = inspect(testEngine)
    assert "analysis_jobs" in inspector.get_table_names()


def test_workUnitTableExists(testEngine):
    inspector = inspect(testEngine)
    assert "work_units" in inspector.get_table_names()


def test_workUnitFrameTableExists(testEngine):
    inspector = inspect(testEngine)
    assert "work_unit_frames" in inspector.get_table_names()


def test_createVideo(testDb):
    video = Video(fileName="test.mp4", filePath="uploads/test.mp4", status="pending")
    testDb.add(video)
    testDb.commit()
    testDb.refresh(video)
    assert video.id is not None
    assert video.status == "pending"


def test_createWorkUnit(testDb):
    video = Video(fileName="test.mp4", filePath="uploads/test.mp4", status="done")
    testDb.add(video)
    testDb.commit()

    workUnit = WorkUnit(
        videoId=video.id,
        sequence=1,
        title="볼트 조립",
        startTime=0.0,
        endTime=10.0,
        duration=10.0,
    )
    testDb.add(workUnit)
    testDb.commit()
    testDb.refresh(workUnit)
    assert workUnit.id is not None
    assert workUnit.isManuallyEdited is False
