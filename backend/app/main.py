import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import UPLOAD_DIR, FRAMES_DIR, getDatabaseUrl
from app.core.database import initDb, Base

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = initDb(getDatabaseUrl())
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Process Maker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/frames", StaticFiles(directory=FRAMES_DIR), name="frames")

from app.api import videos, workUnits  # noqa: E402
app.include_router(videos.router, prefix="/api")
app.include_router(workUnits.router, prefix="/api")
