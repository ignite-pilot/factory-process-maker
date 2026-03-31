from app.core.config import getDatabaseUrl
from app.core.database import Base, createEngine
from app.models.models import Video, AnalysisJob, WorkUnit, WorkUnitFrame  # noqa: F401

engine = createEngine(getDatabaseUrl())
Base.metadata.create_all(bind=engine)
print("테이블 생성 완료")
