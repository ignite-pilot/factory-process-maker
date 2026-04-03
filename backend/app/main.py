import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import UPLOAD_DIR, FRAMES_DIR, getDatabaseUrl
from app.core.database import initDb, Base
from app.core.logger import logger

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        dbUrl = getDatabaseUrl()
        engine = initDb(dbUrl)
        engine.connect().close()
        logger.info("MySQL 데이터베이스 연결 성공")
    except Exception:
        logger.warning("MySQL 연결 실패 — SQLite로 폴백합니다.")
        engine = initDb("sqlite:///./local.db")
    Base.metadata.create_all(bind=engine)
    logger.info("factory-process-maker 서버 시작")
    yield


app = FastAPI(title="Process Maker API", lifespan=lifespan)

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/frames", StaticFiles(directory=FRAMES_DIR), name="frames")

from app.api import videos, workUnits  # noqa: E402
app.include_router(videos.router, prefix="/api")
app.include_router(workUnits.router, prefix="/api")


@app.get("/api/health", include_in_schema=True)
def healthCheck():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

# 프론트엔드 정적 파일 서빙 (빌드 결과물이 있을 때만)
_frontendDist = os.path.join(os.path.dirname(__file__), "..", "frontend_dist")
if os.path.isdir(_frontendDist):
    from fastapi.responses import FileResponse
    from fastapi import Request

    app.mount("/assets", StaticFiles(directory=os.path.join(_frontendDist, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serveReact(request: Request, full_path: str):
        return FileResponse(os.path.join(_frontendDist, "index.html"))
