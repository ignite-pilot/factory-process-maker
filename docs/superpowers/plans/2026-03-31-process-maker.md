# Process Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공장 공정 동영상을 Claude Vision으로 분석하여 작업 단위로 자동 분리하고, 웹 UI에서 사람이 검토·수정 후 MySQL에 저장하는 시스템을 구축한다.

**Architecture:** FastAPI 백엔드가 FFmpeg으로 프레임을 추출하고 Claude Vision API로 배치 분석한다. 분석은 BackgroundTasks로 비동기 처리되며, React 프론트엔드에서 타임라인 편집 UI를 제공한다. MySQL 접속 정보는 AWS Secret Manager에서 로드한다.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, PyMySQL, boto3, anthropic SDK, FFmpeg, React 18, TypeScript, TailwindCSS, React Query, Vite

---

## 파일 구조

```
process-maker/
├── backend/
│   ├── app/
│   │   ├── main.py                        # FastAPI 앱 진입점, CORS 설정
│   │   ├── core/
│   │   │   ├── config.py                  # 환경변수 및 설정
│   │   │   ├── database.py                # SQLAlchemy 엔진, 세션
│   │   │   └── secretManager.py           # AWS Secret Manager 로드
│   │   ├── models/
│   │   │   └── models.py                  # SQLAlchemy ORM 모델 (Video, AnalysisJob, WorkUnit, WorkUnitFrame)
│   │   ├── schemas/
│   │   │   └── schemas.py                 # Pydantic 요청/응답 스키마
│   │   ├── api/
│   │   │   ├── videos.py                  # /api/videos 라우터
│   │   │   └── workUnits.py               # /api/work-units 라우터
│   │   └── services/
│   │       ├── frameExtractor.py          # FFmpeg 프레임 추출
│   │       ├── claudeAnalyzer.py          # Claude Vision API 분석
│   │       └── workUnitBuilder.py         # 프레임 분석 결과 → 작업 단위 그루핑
│   ├── tests/
│   │   ├── test_frameExtractor.py
│   │   ├── test_claudeAnalyzer.py
│   │   ├── test_workUnitBuilder.py
│   │   └── test_api.py
│   ├── uploads/                           # 업로드된 동영상 저장 디렉토리
│   ├── frames/                            # 추출된 프레임 이미지 저장 디렉토리
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── client.ts                  # axios 인스턴스 및 API 함수
│   │   ├── pages/
│   │   │   ├── VideoListPage.tsx          # 동영상 목록 + 업로드
│   │   │   ├── AnalyzingPage.tsx          # 분석 진행 상태
│   │   │   └── EditPage.tsx               # 작업 단위 편집
│   │   ├── components/
│   │   │   ├── VideoCard.tsx              # 동영상 카드 컴포넌트
│   │   │   ├── VideoPlayer.tsx            # 동영상 플레이어
│   │   │   ├── WorkUnitList.tsx           # 작업 단위 목록
│   │   │   └── WorkUnitItem.tsx           # 작업 단위 단일 항목 (인라인 편집)
│   │   └── hooks/
│   │       ├── useVideos.ts               # 동영상 목록/업로드 React Query 훅
│   │       ├── useAnalysis.ts             # 분석 상태 폴링 훅
│   │       └── useWorkUnits.ts            # 작업 단위 CRUD 훅
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── docs/
    └── superpowers/
        ├── specs/2026-03-31-process-maker-design.md
        └── plans/2026-03-31-process-maker.md
```

---

## Task 1: 백엔드 프로젝트 초기화 및 설정

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/secretManager.py`
- Create: `backend/app/core/database.py`
- Create: `backend/app/main.py`

- [ ] **Step 1: requirements.txt 생성**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
pymysql==1.1.1
cryptography==42.0.7
boto3==1.34.100
anthropic==0.28.0
python-multipart==0.0.9
aiofiles==23.2.1
pytest==8.2.0
pytest-asyncio==0.23.7
httpx==0.27.0
pillow==10.3.0
```

- [ ] **Step 2: secretManager.py 작성**

```python
# backend/app/core/secretManager.py
import json
import boto3
from botocore.exceptions import ClientError


def getSecretValue(secretName: str) -> dict:
    client = boto3.client("secretsmanager", region_name="ap-northeast-2")
    try:
        response = client.get_secret_value(SecretId=secretName)
    except ClientError as e:
        raise RuntimeError(f"Secret 로드 실패: {secretName} — {e}")
    return json.loads(response["SecretString"])
```

- [ ] **Step 3: config.py 작성**

```python
# backend/app/core/config.py
import os
from app.core.secretManager import getSecretValue

SECRET_NAME = "prod/ignite-pilot/mysql-realpilot"
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
UPLOAD_DIR = "uploads"
FRAMES_DIR = "frames"

def getDatabaseUrl() -> str:
    secret = getSecretValue(SECRET_NAME)
    host = secret["host"]
    port = secret.get("port", 3306)
    username = secret["username"]
    password = secret["password"]
    dbname = secret.get("dbname", "process_maker")
    return f"mysql+pymysql://{username}:{password}@{host}:{port}/{dbname}"
```

- [ ] **Step 4: database.py 작성**

```python
# backend/app/core/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import getDatabaseUrl

engine = create_engine(getDatabaseUrl(), pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def getDb():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 5: main.py 작성**

```python
# backend/app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import UPLOAD_DIR, FRAMES_DIR
from app.api import videos, workUnits

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

app = FastAPI(title="Process Maker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/frames", StaticFiles(directory=FRAMES_DIR), name="frames")

app.include_router(videos.router, prefix="/api")
app.include_router(workUnits.router, prefix="/api")
```

- [ ] **Step 6: 의존성 설치**

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: 백엔드 프로젝트 초기화 및 설정"
```

---

## Task 2: DB 모델 및 마이그레이션

**Files:**
- Create: `backend/app/models/models.py`
- Create: `backend/app/schemas/schemas.py`

- [ ] **Step 1: models.py 작성**

```python
# backend/app/models/models.py
from datetime import datetime
from sqlalchemy import BigInteger, Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    fileName: Mapped[str] = mapped_column(String(255))
    filePath: Mapped[str] = mapped_column(String(500))
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("pending", "analyzing", "done", "failed"), default="pending"
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    analysisJobs: Mapped[list["AnalysisJob"]] = relationship(back_populates="video")
    workUnits: Mapped[list["WorkUnit"]] = relationship(back_populates="video")


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    videoId: Mapped[int] = mapped_column(BigInteger, ForeignKey("videos.id"))
    status: Mapped[str] = mapped_column(
        Enum("queued", "running", "completed", "failed"), default="queued"
    )
    startedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    video: Mapped["Video"] = relationship(back_populates="analysisJobs")


class WorkUnit(Base):
    __tablename__ = "work_units"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    videoId: Mapped[int] = mapped_column(BigInteger, ForeignKey("videos.id"))
    sequence: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(255))
    startTime: Mapped[float] = mapped_column(Float)
    endTime: Mapped[float] = mapped_column(Float)
    duration: Mapped[float] = mapped_column(Float)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    equipments: Mapped[list | None] = mapped_column(JSON, nullable=True)
    materials: Mapped[list | None] = mapped_column(JSON, nullable=True)
    startFrame: Mapped[int | None] = mapped_column(Integer, nullable=True)
    endFrame: Mapped[int | None] = mapped_column(Integer, nullable=True)
    isManuallyEdited: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    video: Mapped["Video"] = relationship(back_populates="workUnits")
    frames: Mapped[list["WorkUnitFrame"]] = relationship(back_populates="workUnit")


class WorkUnitFrame(Base):
    __tablename__ = "work_unit_frames"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    workUnitId: Mapped[int] = mapped_column(BigInteger, ForeignKey("work_units.id"))
    frameTime: Mapped[float] = mapped_column(Float)
    imagePath: Mapped[str] = mapped_column(String(500))

    workUnit: Mapped["WorkUnit"] = relationship(back_populates="frames")
```

- [ ] **Step 2: schemas.py 작성**

```python
# backend/app/schemas/schemas.py
from datetime import datetime
from pydantic import BaseModel


class VideoResponse(BaseModel):
    id: int
    fileName: str
    filePath: str
    duration: float | None
    status: str
    createdAt: datetime

    model_config = {"from_attributes": True}


class AnalysisJobResponse(BaseModel):
    id: int
    videoId: int
    status: str
    startedAt: datetime | None
    completedAt: datetime | None

    model_config = {"from_attributes": True}


class WorkUnitFrameResponse(BaseModel):
    id: int
    workUnitId: int
    frameTime: float
    imagePath: str

    model_config = {"from_attributes": True}


class WorkUnitResponse(BaseModel):
    id: int
    videoId: int
    sequence: int
    title: str
    startTime: float
    endTime: float
    duration: float
    description: str | None
    equipments: list | None
    materials: list | None
    startFrame: int | None
    endFrame: int | None
    isManuallyEdited: bool
    createdAt: datetime
    updatedAt: datetime
    frames: list[WorkUnitFrameResponse] = []

    model_config = {"from_attributes": True}


class WorkUnitUpdateRequest(BaseModel):
    title: str | None = None
    startTime: float | None = None
    endTime: float | None = None
    description: str | None = None
    equipments: list | None = None
    materials: list | None = None


class WorkUnitCreateRequest(BaseModel):
    sequence: int
    title: str
    startTime: float
    endTime: float
    description: str | None = None
    equipments: list | None = None
    materials: list | None = None


class WorkUnitReorderRequest(BaseModel):
    orderedIds: list[int]
```

- [ ] **Step 3: DB 테이블 생성 스크립트 작성**

```python
# backend/create_tables.py
from app.core.database import Base, engine
from app.models.models import Video, AnalysisJob, WorkUnit, WorkUnitFrame  # noqa: F401

Base.metadata.create_all(bind=engine)
print("테이블 생성 완료")
```

- [ ] **Step 4: 테이블 생성 실행**

```bash
cd backend
python create_tables.py
```

Expected: `테이블 생성 완료`

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/ backend/app/schemas/ backend/create_tables.py
git commit -m "feat: DB 모델 및 Pydantic 스키마 정의"
```

---

## Task 3: FrameExtractor 서비스

**Files:**
- Create: `backend/app/services/frameExtractor.py`
- Create: `backend/tests/test_frameExtractor.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_frameExtractor.py
import os
import pytest
from unittest.mock import patch, MagicMock
from app.services.frameExtractor import FrameExtractor


def test_getOutputDir_returnsCorrectPath():
    extractor = FrameExtractor(videoId=1, videoPath="uploads/test.mp4")
    assert extractor.getOutputDir() == "frames/1"


def test_extractFrames_callsFFmpegWithCorrectArgs():
    extractor = FrameExtractor(videoId=1, videoPath="uploads/test.mp4")
    with patch("app.services.frameExtractor.subprocess.run") as mockRun:
        mockRun.return_value = MagicMock(returncode=0)
        with patch("app.services.frameExtractor.os.makedirs"):
            with patch("app.services.frameExtractor.glob.glob") as mockGlob:
                mockGlob.return_value = ["frames/1/frame_0001.jpg"]
                result = extractor.extractFrames(intervalSeconds=1)

    args = mockRun.call_args[0][0]
    assert "ffmpeg" in args
    assert "-vf" in args
    assert "fps=1" in args
    assert result == ["frames/1/frame_0001.jpg"]


def test_getVideoDuration_parsesFFprobeOutput():
    extractor = FrameExtractor(videoId=1, videoPath="uploads/test.mp4")
    with patch("app.services.frameExtractor.subprocess.run") as mockRun:
        mockRun.return_value = MagicMock(
            returncode=0, stdout='{"format": {"duration": "120.5"}}'
        )
        duration = extractor.getVideoDuration()
    assert duration == 120.5
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
pytest tests/test_frameExtractor.py -v
```

Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: frameExtractor.py 구현**

```python
# backend/app/services/frameExtractor.py
import glob
import json
import os
import subprocess
from app.core.config import FRAMES_DIR


class FrameExtractor:
    def __init__(self, videoId: int, videoPath: str):
        self.videoId = videoId
        self.videoPath = videoPath

    def getOutputDir(self) -> str:
        return os.path.join(FRAMES_DIR, str(self.videoId))

    def extractFrames(self, intervalSeconds: int = 1) -> list[str]:
        outputDir = self.getOutputDir()
        os.makedirs(outputDir, exist_ok=True)
        outputPattern = os.path.join(outputDir, "frame_%04d.jpg")
        cmd = [
            "ffmpeg", "-i", self.videoPath,
            "-vf", f"fps=1/{intervalSeconds}",
            "-q:v", "2",
            outputPattern,
            "-y",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg 프레임 추출 실패: {result.stderr}")
        return sorted(glob.glob(os.path.join(outputDir, "frame_*.jpg")))

    def getVideoDuration(self) -> float:
        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            self.videoPath,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFprobe 실행 실패: {result.stderr}")
        data = json.loads(result.stdout)
        return float(data["format"]["duration"])
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
pytest tests/test_frameExtractor.py -v
```

Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/frameExtractor.py backend/tests/test_frameExtractor.py
git commit -m "feat: FrameExtractor 서비스 구현"
```

---

## Task 4: ClaudeAnalyzer 서비스

**Files:**
- Create: `backend/app/services/claudeAnalyzer.py`
- Create: `backend/tests/test_claudeAnalyzer.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_claudeAnalyzer.py
import base64
import pytest
from unittest.mock import patch, MagicMock, mock_open
from app.services.claudeAnalyzer import ClaudeAnalyzer, FrameAnalysisResult


def test_analyzeFrame_returnsFrameAnalysisResult():
    analyzer = ClaudeAnalyzer()
    mockResponse = MagicMock()
    mockResponse.content = [MagicMock(text='{"title": "부품 조립", "description": "볼트 체결 작업", "equipments": ["전동드라이버"], "materials": ["볼트 M8"]}')]

    with patch("builtins.open", mock_open(read_data=b"fake_image_data")):
        with patch.object(analyzer.client.messages, "create", return_value=mockResponse):
            result = analyzer.analyzeFrame(framePath="frames/1/frame_0001.jpg", frameTime=1.0)

    assert isinstance(result, FrameAnalysisResult)
    assert result.title == "부품 조립"
    assert result.frameTime == 1.0
    assert "전동드라이버" in result.equipments


def test_analyzeFrame_handlesInvalidJson():
    analyzer = ClaudeAnalyzer()
    mockResponse = MagicMock()
    mockResponse.content = [MagicMock(text="분석할 수 없습니다")]

    with patch("builtins.open", mock_open(read_data=b"fake_image_data")):
        with patch.object(analyzer.client.messages, "create", return_value=mockResponse):
            result = analyzer.analyzeFrame(framePath="frames/1/frame_0001.jpg", frameTime=2.0)

    assert result.title == "알 수 없음"
    assert result.frameTime == 2.0
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
pytest tests/test_claudeAnalyzer.py -v
```

Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: claudeAnalyzer.py 구현**

```python
# backend/app/services/claudeAnalyzer.py
import base64
import json
from dataclasses import dataclass, field
import anthropic
from app.core.config import ANTHROPIC_API_KEY

ANALYSIS_PROMPT = """
이 이미지는 공장 공정 동영상의 한 프레임입니다.
이 프레임에서 수행 중인 작업을 분석하여 아래 JSON 형식으로만 응답하세요.
다른 텍스트는 절대 포함하지 마세요.

{
  "title": "작업명 (짧고 명확하게)",
  "description": "작업 설명 (1~2문장)",
  "equipments": ["사용 설비1", "사용 설비2"],
  "materials": ["사용 자재1", "사용 자재2"]
}
"""


@dataclass
class FrameAnalysisResult:
    frameTime: float
    title: str
    description: str
    equipments: list[str] = field(default_factory=list)
    materials: list[str] = field(default_factory=list)


class ClaudeAnalyzer:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    def analyzeFrame(self, framePath: str, frameTime: float) -> FrameAnalysisResult:
        with open(framePath, "rb") as f:
            imageData = base64.standard_b64encode(f.read()).decode("utf-8")

        try:
            response = self.client.messages.create(
                model="claude-opus-4-6",
                max_tokens=512,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": imageData,
                                },
                            },
                            {"type": "text", "text": ANALYSIS_PROMPT},
                        ],
                    }
                ],
            )
            parsed = json.loads(response.content[0].text)
            return FrameAnalysisResult(
                frameTime=frameTime,
                title=parsed.get("title", "알 수 없음"),
                description=parsed.get("description", ""),
                equipments=parsed.get("equipments", []),
                materials=parsed.get("materials", []),
            )
        except (json.JSONDecodeError, KeyError, IndexError):
            return FrameAnalysisResult(
                frameTime=frameTime,
                title="알 수 없음",
                description="",
                equipments=[],
                materials=[],
            )
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
pytest tests/test_claudeAnalyzer.py -v
```

Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/claudeAnalyzer.py backend/tests/test_claudeAnalyzer.py
git commit -m "feat: ClaudeAnalyzer 서비스 구현"
```

---

## Task 5: WorkUnitBuilder 서비스

**Files:**
- Create: `backend/app/services/workUnitBuilder.py`
- Create: `backend/tests/test_workUnitBuilder.py`

- [ ] **Step 1: 테스트 작성**

```python
# backend/tests/test_workUnitBuilder.py
import pytest
from app.services.workUnitBuilder import WorkUnitBuilder
from app.services.claudeAnalyzer import FrameAnalysisResult


def makeResult(frameTime: float, title: str, equipments=None, materials=None) -> FrameAnalysisResult:
    return FrameAnalysisResult(
        frameTime=frameTime,
        title=title,
        description=f"{title} 설명",
        equipments=equipments or [],
        materials=materials or [],
    )


def test_build_groupsConsecutiveSameTitle():
    results = [
        makeResult(1.0, "볼트 조립"),
        makeResult(2.0, "볼트 조립"),
        makeResult(3.0, "볼트 조립"),
        makeResult(4.0, "검사"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 2
    assert units[0]["title"] == "볼트 조립"
    assert units[0]["startTime"] == 1.0
    assert units[0]["endTime"] == 3.0
    assert units[1]["title"] == "검사"


def test_build_calculatesDuration():
    results = [
        makeResult(0.0, "작업A"),
        makeResult(1.0, "작업A"),
        makeResult(2.0, "작업B"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert units[0]["duration"] == pytest.approx(1.0)
    assert units[1]["duration"] == pytest.approx(0.0)


def test_build_mergesEquipmentsAndMaterials():
    results = [
        makeResult(1.0, "작업A", equipments=["드라이버"], materials=["볼트"]),
        makeResult(2.0, "작업A", equipments=["드라이버", "렌치"], materials=["너트"]),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert set(units[0]["equipments"]) == {"드라이버", "렌치"}
    assert set(units[0]["materials"]) == {"볼트", "너트"}


def test_build_assignsSequence():
    results = [
        makeResult(1.0, "작업A"),
        makeResult(2.0, "작업B"),
        makeResult(3.0, "작업C"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert [u["sequence"] for u in units] == [1, 2, 3]
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend
pytest tests/test_workUnitBuilder.py -v
```

Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: workUnitBuilder.py 구현**

```python
# backend/app/services/workUnitBuilder.py
from app.services.claudeAnalyzer import FrameAnalysisResult


class WorkUnitBuilder:
    def build(self, frameResults: list[FrameAnalysisResult]) -> list[dict]:
        if not frameResults:
            return []

        units = []
        currentGroup: list[FrameAnalysisResult] = [frameResults[0]]

        for result in frameResults[1:]:
            if result.title == currentGroup[-1].title:
                currentGroup.append(result)
            else:
                units.append(self._groupToUnit(currentGroup, len(units) + 1))
                currentGroup = [result]

        units.append(self._groupToUnit(currentGroup, len(units) + 1))
        return units

    def _groupToUnit(self, group: list[FrameAnalysisResult], sequence: int) -> dict:
        allEquipments = set()
        allMaterials = set()
        descriptions = []

        for r in group:
            allEquipments.update(r.equipments)
            allMaterials.update(r.materials)
            if r.description:
                descriptions.append(r.description)

        startTime = group[0].frameTime
        endTime = group[-1].frameTime
        return {
            "sequence": sequence,
            "title": group[0].title,
            "startTime": startTime,
            "endTime": endTime,
            "duration": endTime - startTime,
            "description": descriptions[0] if descriptions else "",
            "equipments": list(allEquipments),
            "materials": list(allMaterials),
            "startFrame": round(startTime),
            "endFrame": round(endTime),
        }
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
pytest tests/test_workUnitBuilder.py -v
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/workUnitBuilder.py backend/tests/test_workUnitBuilder.py
git commit -m "feat: WorkUnitBuilder 서비스 구현"
```

---

## Task 6: Videos API 라우터

**Files:**
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/videos.py`
- Create: `backend/tests/test_api.py` (videos 부분)

- [ ] **Step 1: `__init__.py` 생성**

```python
# backend/app/api/__init__.py
```

- [ ] **Step 2: videos.py 작성**

```python
# backend/app/api/videos.py
import os
import shutil
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.core.config import UPLOAD_DIR
from app.core.database import getDb
from app.models.models import AnalysisJob, Video, WorkUnit, WorkUnitFrame
from app.schemas.schemas import AnalysisJobResponse, VideoResponse, WorkUnitResponse
from app.services.claudeAnalyzer import ClaudeAnalyzer
from app.services.frameExtractor import FrameExtractor
from app.services.workUnitBuilder import WorkUnitBuilder

router = APIRouter()


@router.post("/videos/upload", response_model=VideoResponse)
async def uploadVideo(file: UploadFile = File(...), db: Session = Depends(getDb)):
    allowed = {".mp4", ".mov", ".avi"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 형식: {ext}")

    savePath = os.path.join(UPLOAD_DIR, file.filename)
    with open(savePath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    video = Video(fileName=file.filename, filePath=savePath, status="pending")
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


@router.get("/videos", response_model=list[VideoResponse])
def listVideos(db: Session = Depends(getDb)):
    return db.query(Video).order_by(Video.createdAt.desc()).all()


@router.get("/videos/{videoId}", response_model=VideoResponse)
def getVideo(videoId: int, db: Session = Depends(getDb)):
    video = db.get(Video, videoId)
    if not video:
        raise HTTPException(status_code=404, detail="동영상을 찾을 수 없습니다")
    return video


@router.post("/videos/{videoId}/analyze", response_model=AnalysisJobResponse)
def startAnalysis(videoId: int, background_tasks: BackgroundTasks, db: Session = Depends(getDb)):
    video = db.get(Video, videoId)
    if not video:
        raise HTTPException(status_code=404, detail="동영상을 찾을 수 없습니다")
    if video.status == "analyzing":
        raise HTTPException(status_code=400, detail="이미 분석 중입니다")

    job = AnalysisJob(videoId=videoId, status="queued")
    db.add(job)
    video.status = "analyzing"
    db.commit()
    db.refresh(job)

    background_tasks.add_task(runAnalysis, jobId=job.id, videoId=videoId)
    return job


@router.get("/videos/{videoId}/status", response_model=AnalysisJobResponse)
def getAnalysisStatus(videoId: int, db: Session = Depends(getDb)):
    job = (
        db.query(AnalysisJob)
        .filter(AnalysisJob.videoId == videoId)
        .order_by(AnalysisJob.id.desc())
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="분석 작업을 찾을 수 없습니다")
    return job


@router.get("/videos/{videoId}/work-units", response_model=list[WorkUnitResponse])
def listWorkUnits(videoId: int, db: Session = Depends(getDb)):
    return (
        db.query(WorkUnit)
        .filter(WorkUnit.videoId == videoId)
        .order_by(WorkUnit.sequence)
        .all()
    )


def runAnalysis(jobId: int, videoId: int):
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        job = db.get(AnalysisJob, jobId)
        video = db.get(Video, videoId)
        job.status = "running"
        job.startedAt = datetime.utcnow()
        db.commit()

        extractor = FrameExtractor(videoId=videoId, videoPath=video.filePath)
        duration = extractor.getVideoDuration()
        video.duration = duration
        db.commit()

        framePaths = extractor.extractFrames(intervalSeconds=1)

        analyzer = ClaudeAnalyzer()
        frameResults = []
        for i, framePath in enumerate(framePaths):
            frameTime = float(i)
            result = analyzer.analyzeFrame(framePath=framePath, frameTime=frameTime)
            frameResults.append(result)

        builder = WorkUnitBuilder()
        unitDicts = builder.build(frameResults=frameResults)

        for unitDict in unitDicts:
            workUnit = WorkUnit(videoId=videoId, **unitDict)
            db.add(workUnit)
            db.flush()

            midFrame = framePaths[round((unitDict["startFrame"] + unitDict["endFrame"]) / 2)]
            frame = WorkUnitFrame(
                workUnitId=workUnit.id,
                frameTime=(unitDict["startTime"] + unitDict["endTime"]) / 2,
                imagePath=midFrame,
            )
            db.add(frame)

        video.status = "done"
        job.status = "completed"
        job.completedAt = datetime.utcnow()
        db.commit()

    except Exception as e:
        db.rollback()
        job = db.get(AnalysisJob, jobId)
        video = db.get(Video, videoId)
        if job:
            job.status = "failed"
        if video:
            video.status = "failed"
        db.commit()
        raise e
    finally:
        db.close()
```

- [ ] **Step 3: 테스트 작성**

```python
# backend/tests/test_api.py
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, getDb

TEST_DB_URL = "sqlite:///./test.db"
testEngine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=testEngine)


def overrideGetDb():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[getDb] = overrideGetDb
Base.metadata.create_all(bind=testEngine)
client = TestClient(app)


def test_uploadVideo_unsupportedFormat():
    response = client.post(
        "/api/videos/upload",
        files={"file": ("test.txt", b"data", "text/plain")},
    )
    assert response.status_code == 400


def test_listVideos_returnsEmptyList():
    response = client.get("/api/videos")
    assert response.status_code == 200
    assert response.json() == []


def test_getVideo_notFound():
    response = client.get("/api/videos/9999")
    assert response.status_code == 404


def test_startAnalysis_notFound():
    response = client.post("/api/videos/9999/analyze")
    assert response.status_code == 404
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd backend
pytest tests/test_api.py -v
```

Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/ backend/tests/test_api.py
git commit -m "feat: Videos API 라우터 구현"
```

---

## Task 7: WorkUnits API 라우터

**Files:**
- Create: `backend/app/api/workUnits.py`

- [ ] **Step 1: workUnits.py 작성**

```python
# backend/app/api/workUnits.py
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import getDb
from app.models.models import Video, WorkUnit
from app.schemas.schemas import (
    WorkUnitCreateRequest,
    WorkUnitReorderRequest,
    WorkUnitResponse,
    WorkUnitUpdateRequest,
)

router = APIRouter()


@router.post("/videos/{videoId}/work-units", response_model=WorkUnitResponse)
def createWorkUnit(videoId: int, body: WorkUnitCreateRequest, db: Session = Depends(getDb)):
    video = db.get(Video, videoId)
    if not video:
        raise HTTPException(status_code=404, detail="동영상을 찾을 수 없습니다")

    workUnit = WorkUnit(
        videoId=videoId,
        sequence=body.sequence,
        title=body.title,
        startTime=body.startTime,
        endTime=body.endTime,
        duration=body.endTime - body.startTime,
        description=body.description,
        equipments=body.equipments,
        materials=body.materials,
        isManuallyEdited=True,
    )
    db.add(workUnit)
    db.commit()
    db.refresh(workUnit)
    return workUnit


@router.put("/work-units/{workUnitId}", response_model=WorkUnitResponse)
def updateWorkUnit(workUnitId: int, body: WorkUnitUpdateRequest, db: Session = Depends(getDb)):
    workUnit = db.get(WorkUnit, workUnitId)
    if not workUnit:
        raise HTTPException(status_code=404, detail="작업 단위를 찾을 수 없습니다")

    if body.title is not None:
        workUnit.title = body.title
    if body.startTime is not None:
        workUnit.startTime = body.startTime
    if body.endTime is not None:
        workUnit.endTime = body.endTime
    if body.startTime is not None or body.endTime is not None:
        workUnit.duration = workUnit.endTime - workUnit.startTime
    if body.description is not None:
        workUnit.description = body.description
    if body.equipments is not None:
        workUnit.equipments = body.equipments
    if body.materials is not None:
        workUnit.materials = body.materials

    workUnit.isManuallyEdited = True
    workUnit.updatedAt = datetime.utcnow()
    db.commit()
    db.refresh(workUnit)
    return workUnit


@router.post("/work-units/reorder")
def reorderWorkUnits(body: WorkUnitReorderRequest, db: Session = Depends(getDb)):
    for seq, workUnitId in enumerate(body.orderedIds, start=1):
        workUnit = db.get(WorkUnit, workUnitId)
        if workUnit:
            workUnit.sequence = seq
    db.commit()
    return {"ok": True}


@router.delete("/work-units/{workUnitId}")
def deleteWorkUnit(workUnitId: int, db: Session = Depends(getDb)):
    workUnit = db.get(WorkUnit, workUnitId)
    if not workUnit:
        raise HTTPException(status_code=404, detail="작업 단위를 찾을 수 없습니다")
    db.delete(workUnit)
    db.commit()
    return {"ok": True}
```

- [ ] **Step 2: test_api.py에 WorkUnits 테스트 추가**

```python
# backend/tests/test_api.py 에 아래 테스트 추가

def test_updateWorkUnit_notFound():
    response = client.put(
        "/api/work-units/9999",
        json={"title": "새 작업명"},
    )
    assert response.status_code == 404


def test_deleteWorkUnit_notFound():
    response = client.delete("/api/work-units/9999")
    assert response.status_code == 404


def test_reorderWorkUnits_returnsOk():
    response = client.post(
        "/api/work-units/reorder",
        json={"orderedIds": []},
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True}
```

- [ ] **Step 3: 테스트 실행 — 통과 확인**

```bash
cd backend
pytest tests/test_api.py -v
```

Expected: 7 passed

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/workUnits.py backend/tests/test_api.py
git commit -m "feat: WorkUnits API 라우터 구현"
```

---

## Task 8: 프론트엔드 프로젝트 초기화

**Files:**
- Create: `frontend/` (Vite + React + TypeScript)
- Create: `frontend/src/api/client.ts`

- [ ] **Step 1: Vite 프로젝트 생성**

```bash
cd /path/to/process-maker
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install axios @tanstack/react-query react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: tailwind.config.js 설정**

```js
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 3: index.css에 Tailwind 지시어 추가**

```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: API client 작성**

```typescript
// frontend/src/api/client.ts
import axios from "axios"

const apiClient = axios.create({
  baseURL: "http://localhost:8000/api",
})

export interface VideoResponse {
  id: number
  fileName: string
  filePath: string
  duration: number | null
  status: "pending" | "analyzing" | "done" | "failed"
  createdAt: string
}

export interface WorkUnitFrameResponse {
  id: number
  workUnitId: number
  frameTime: number
  imagePath: string
}

export interface WorkUnitResponse {
  id: number
  videoId: number
  sequence: number
  title: string
  startTime: number
  endTime: number
  duration: number
  description: string | null
  equipments: string[] | null
  materials: string[] | null
  startFrame: number | null
  endFrame: number | null
  isManuallyEdited: boolean
  createdAt: string
  updatedAt: string
  frames: WorkUnitFrameResponse[]
}

export interface WorkUnitUpdateRequest {
  title?: string
  startTime?: number
  endTime?: number
  description?: string
  equipments?: string[]
  materials?: string[]
}

export interface WorkUnitCreateRequest {
  sequence: number
  title: string
  startTime: number
  endTime: number
  description?: string
  equipments?: string[]
  materials?: string[]
}

export const videosApi = {
  list: () => apiClient.get<VideoResponse[]>("/videos").then(r => r.data),
  get: (id: number) => apiClient.get<VideoResponse>(`/videos/${id}`).then(r => r.data),
  upload: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiClient.post<VideoResponse>("/videos/upload", formData).then(r => r.data)
  },
  startAnalysis: (id: number) =>
    apiClient.post(`/videos/${id}/analyze`).then(r => r.data),
  getStatus: (id: number) =>
    apiClient.get(`/videos/${id}/status`).then(r => r.data),
  listWorkUnits: (id: number) =>
    apiClient.get<WorkUnitResponse[]>(`/videos/${id}/work-units`).then(r => r.data),
  createWorkUnit: (id: number, body: WorkUnitCreateRequest) =>
    apiClient.post<WorkUnitResponse>(`/videos/${id}/work-units`, body).then(r => r.data),
}

export const workUnitsApi = {
  update: (id: number, body: WorkUnitUpdateRequest) =>
    apiClient.put<WorkUnitResponse>(`/work-units/${id}`, body).then(r => r.data),
  delete: (id: number) =>
    apiClient.delete(`/work-units/${id}`).then(r => r.data),
  reorder: (orderedIds: number[]) =>
    apiClient.post("/work-units/reorder", { orderedIds }).then(r => r.data),
}
```

- [ ] **Step 5: App.tsx에 Router 설정**

```tsx
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import VideoListPage from "./pages/VideoListPage"
import AnalyzingPage from "./pages/AnalyzingPage"
import EditPage from "./pages/EditPage"

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<VideoListPage />} />
          <Route path="/videos/:id/analyzing" element={<AnalyzingPage />} />
          <Route path="/videos/:id/edit" element={<EditPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: 프론트엔드 프로젝트 초기화 및 API client 구성"
```

---

## Task 9: React Query 훅 구현

**Files:**
- Create: `frontend/src/hooks/useVideos.ts`
- Create: `frontend/src/hooks/useAnalysis.ts`
- Create: `frontend/src/hooks/useWorkUnits.ts`

- [ ] **Step 1: useVideos.ts 작성**

```typescript
// frontend/src/hooks/useVideos.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { videosApi } from "../api/client"

export function useVideoList() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: videosApi.list,
  })
}

export function useVideoDetail(id: number) {
  return useQuery({
    queryKey: ["videos", id],
    queryFn: () => videosApi.get(id),
  })
}

export function useUploadVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => videosApi.upload(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["videos"] }),
  })
}

export function useStartAnalysis() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (videoId: number) => videosApi.startAnalysis(videoId),
    onSuccess: (_data, videoId) =>
      queryClient.invalidateQueries({ queryKey: ["videos", videoId] }),
  })
}
```

- [ ] **Step 2: useAnalysis.ts 작성**

```typescript
// frontend/src/hooks/useAnalysis.ts
import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { videosApi } from "../api/client"

export function useAnalysisPolling(videoId: number) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ["analysis-status", videoId],
    queryFn: () => videosApi.getStatus(videoId),
    refetchInterval: 3000,
  })

  useEffect(() => {
    if (data?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["videos", videoId] })
      navigate(`/videos/${videoId}/edit`)
    }
  }, [data?.status, videoId, navigate, queryClient])

  return data
}
```

- [ ] **Step 3: useWorkUnits.ts 작성**

```typescript
// frontend/src/hooks/useWorkUnits.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { WorkUnitCreateRequest, WorkUnitUpdateRequest, videosApi, workUnitsApi } from "../api/client"

export function useWorkUnits(videoId: number) {
  return useQuery({
    queryKey: ["work-units", videoId],
    queryFn: () => videosApi.listWorkUnits(videoId),
  })
}

export function useUpdateWorkUnit(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: WorkUnitUpdateRequest }) =>
      workUnitsApi.update(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["work-units", videoId] }),
  })
}

export function useDeleteWorkUnit(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workUnitsApi.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["work-units", videoId] }),
  })
}

export function useCreateWorkUnit(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: WorkUnitCreateRequest) =>
      videosApi.createWorkUnit(videoId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["work-units", videoId] }),
  })
}

export function useReorderWorkUnits(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: number[]) => workUnitsApi.reorder(orderedIds),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["work-units", videoId] }),
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: React Query 훅 구현"
```

---

## Task 10: VideoListPage — 동영상 목록 및 업로드

**Files:**
- Create: `frontend/src/pages/VideoListPage.tsx`
- Create: `frontend/src/components/VideoCard.tsx`

- [ ] **Step 1: VideoCard.tsx 작성**

```tsx
// frontend/src/components/VideoCard.tsx
import { useNavigate } from "react-router-dom"
import { VideoResponse } from "../api/client"
import { useStartAnalysis } from "../hooks/useVideos"

const statusLabel: Record<string, string> = {
  pending: "대기중",
  analyzing: "분석중",
  done: "완료",
  failed: "실패",
}

const statusColor: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  analyzing: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
}

export default function VideoCard({ video }: { video: VideoResponse }) {
  const navigate = useNavigate()
  const startAnalysis = useStartAnalysis()

  const handleAnalyze = () => {
    startAnalysis.mutate(video.id, {
      onSuccess: () => navigate(`/videos/${video.id}/analyzing`),
    })
  }

  const handleEdit = () => navigate(`/videos/${video.id}/edit`)

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-2 bg-white shadow-sm">
      <div className="flex justify-between items-center">
        <span className="font-medium truncate">{video.fileName}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${statusColor[video.status]}`}>
          {statusLabel[video.status]}
        </span>
      </div>
      {video.duration && (
        <span className="text-sm text-gray-500">{video.duration.toFixed(1)}초</span>
      )}
      <div className="flex gap-2 mt-2">
        {video.status === "pending" && (
          <button
            onClick={handleAnalyze}
            disabled={startAnalysis.isPending}
            className="flex-1 bg-blue-600 text-white text-sm py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            분석 시작
          </button>
        )}
        {video.status === "done" && (
          <button
            onClick={handleEdit}
            className="flex-1 bg-green-600 text-white text-sm py-1 rounded hover:bg-green-700"
          >
            편집
          </button>
        )}
        {video.status === "analyzing" && (
          <button
            onClick={() => navigate(`/videos/${video.id}/analyzing`)}
            className="flex-1 bg-yellow-500 text-white text-sm py-1 rounded hover:bg-yellow-600"
          >
            진행 확인
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: VideoListPage.tsx 작성**

```tsx
// frontend/src/pages/VideoListPage.tsx
import { useRef } from "react"
import VideoCard from "../components/VideoCard"
import { useUploadVideo, useVideoList } from "../hooks/useVideos"

export default function VideoListPage() {
  const { data: videos, isLoading } = useVideoList()
  const uploadVideo = useUploadVideo()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadVideo.mutate(file)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">공정 동영상 분석</h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadVideo.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {uploadVideo.isPending ? "업로드 중..." : "동영상 업로드"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mov,.avi"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {isLoading && <p className="text-gray-500">불러오는 중...</p>}

      {videos?.length === 0 && (
        <p className="text-center text-gray-400 mt-20">
          업로드된 동영상이 없습니다. 동영상을 업로드하세요.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos?.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/VideoListPage.tsx frontend/src/components/VideoCard.tsx
git commit -m "feat: 동영상 목록 및 업로드 페이지 구현"
```

---

## Task 11: AnalyzingPage — 분석 진행 상태

**Files:**
- Create: `frontend/src/pages/AnalyzingPage.tsx`

- [ ] **Step 1: AnalyzingPage.tsx 작성**

```tsx
// frontend/src/pages/AnalyzingPage.tsx
import { useParams } from "react-router-dom"
import { useAnalysisPolling } from "../hooks/useAnalysis"

export default function AnalyzingPage() {
  const { id } = useParams<{ id: string }>()
  const videoId = Number(id)
  const status = useAnalysisPolling(videoId)

  const statusMessage: Record<string, string> = {
    queued: "분석 대기 중...",
    running: "AI가 영상을 분석하고 있습니다...",
    completed: "분석 완료! 편집 페이지로 이동합니다.",
    failed: "분석에 실패했습니다.",
  }

  return (
    <div className="max-w-xl mx-auto p-6 mt-20 text-center">
      <div className="text-4xl mb-6 animate-spin inline-block">⚙️</div>
      <h2 className="text-xl font-semibold mb-2">공정 분석 중</h2>
      <p className="text-gray-500">
        {status ? statusMessage[status.status] : "상태를 불러오는 중..."}
      </p>
      {status?.status === "failed" && (
        <p className="text-red-500 mt-4">오류가 발생했습니다. 다시 시도해주세요.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/AnalyzingPage.tsx
git commit -m "feat: 분석 진행 상태 페이지 구현"
```

---

## Task 12: EditPage — 작업 단위 편집

**Files:**
- Create: `frontend/src/pages/EditPage.tsx`
- Create: `frontend/src/components/VideoPlayer.tsx`
- Create: `frontend/src/components/WorkUnitList.tsx`
- Create: `frontend/src/components/WorkUnitItem.tsx`

- [ ] **Step 1: VideoPlayer.tsx 작성**

```tsx
// frontend/src/components/VideoPlayer.tsx
import { useRef } from "react"

interface VideoPlayerProps {
  filePath: string
  onTimeUpdate?: (currentTime: number) => void
}

export default function VideoPlayer({ filePath, onTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        src={`http://localhost:8000/${filePath}`}
        controls
        className="w-full"
        onTimeUpdate={() => onTimeUpdate?.(videoRef.current?.currentTime ?? 0)}
      />
    </div>
  )
}
```

- [ ] **Step 2: WorkUnitItem.tsx 작성**

```tsx
// frontend/src/components/WorkUnitItem.tsx
import { useState } from "react"
import { WorkUnitResponse, WorkUnitUpdateRequest } from "../api/client"

interface WorkUnitItemProps {
  workUnit: WorkUnitResponse
  onUpdate: (id: number, body: WorkUnitUpdateRequest) => void
  onDelete: (id: number) => void
}

export default function WorkUnitItem({ workUnit, onUpdate, onDelete }: WorkUnitItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(workUnit.title)
  const [startTime, setStartTime] = useState(workUnit.startTime)
  const [endTime, setEndTime] = useState(workUnit.endTime)
  const [description, setDescription] = useState(workUnit.description ?? "")
  const [equipments, setEquipments] = useState((workUnit.equipments ?? []).join(", "))
  const [materials, setMaterials] = useState((workUnit.materials ?? []).join(", "))

  const handleSave = () => {
    onUpdate(workUnit.id, {
      title,
      startTime,
      endTime,
      description,
      equipments: equipments.split(",").map(s => s.trim()).filter(Boolean),
      materials: materials.split(",").map(s => s.trim()).filter(Boolean),
    })
    setIsEditing(false)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-400">#{workUnit.sequence}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-blue-600 hover:underline"
          >
            {isEditing ? "취소" : "수정"}
          </button>
          <button
            onClick={() => onDelete(workUnit.id)}
            className="text-xs text-red-500 hover:underline"
          >
            삭제
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-2">
          <input
            className="border rounded px-2 py-1 text-sm w-full"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="작업명"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">시작(초)</label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-sm w-full"
                value={startTime}
                onChange={e => setStartTime(Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">종료(초)</label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-sm w-full"
                value={endTime}
                onChange={e => setEndTime(Number(e.target.value))}
              />
            </div>
          </div>
          <textarea
            className="border rounded px-2 py-1 text-sm w-full"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="작업 설명"
            rows={2}
          />
          <input
            className="border rounded px-2 py-1 text-sm w-full"
            value={equipments}
            onChange={e => setEquipments(e.target.value)}
            placeholder="설비 (쉼표로 구분)"
          />
          <input
            className="border rounded px-2 py-1 text-sm w-full"
            value={materials}
            onChange={e => setMaterials(e.target.value)}
            placeholder="자재 (쉼표로 구분)"
          />
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white text-sm py-1 rounded hover:bg-blue-700"
          >
            저장
          </button>
        </div>
      ) : (
        <div>
          <p className="font-semibold">{workUnit.title}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatTime(workUnit.startTime)} ~ {formatTime(workUnit.endTime)} ({workUnit.duration.toFixed(1)}초)
          </p>
          {workUnit.description && (
            <p className="text-sm text-gray-600 mt-1">{workUnit.description}</p>
          )}
          {workUnit.equipments && workUnit.equipments.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">설비: {workUnit.equipments.join(", ")}</p>
          )}
          {workUnit.materials && workUnit.materials.length > 0 && (
            <p className="text-xs text-gray-500">자재: {workUnit.materials.join(", ")}</p>
          )}
          {workUnit.isManuallyEdited && (
            <span className="text-xs text-blue-400">수동 편집됨</span>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: WorkUnitList.tsx 작성**

```tsx
// frontend/src/components/WorkUnitList.tsx
import { WorkUnitResponse, WorkUnitUpdateRequest } from "../api/client"
import WorkUnitItem from "./WorkUnitItem"

interface WorkUnitListProps {
  workUnits: WorkUnitResponse[]
  onUpdate: (id: number, body: WorkUnitUpdateRequest) => void
  onDelete: (id: number) => void
  onAdd: () => void
}

export default function WorkUnitList({ workUnits, onUpdate, onDelete, onAdd }: WorkUnitListProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-lg">작업 단위 목록</h2>
        <button
          onClick={onAdd}
          className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
        >
          + 작업 추가
        </button>
      </div>
      {workUnits.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-6">작업 단위가 없습니다.</p>
      )}
      {workUnits.map(wu => (
        <WorkUnitItem
          key={wu.id}
          workUnit={wu}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: EditPage.tsx 작성**

```tsx
// frontend/src/pages/EditPage.tsx
import { useParams } from "react-router-dom"
import VideoPlayer from "../components/VideoPlayer"
import WorkUnitList from "../components/WorkUnitList"
import { useVideoDetail } from "../hooks/useVideos"
import {
  useCreateWorkUnit,
  useDeleteWorkUnit,
  useUpdateWorkUnit,
  useWorkUnits,
} from "../hooks/useWorkUnits"

export default function EditPage() {
  const { id } = useParams<{ id: string }>()
  const videoId = Number(id)

  const { data: video } = useVideoDetail(videoId)
  const { data: workUnits } = useWorkUnits(videoId)
  const updateWorkUnit = useUpdateWorkUnit(videoId)
  const deleteWorkUnit = useDeleteWorkUnit(videoId)
  const createWorkUnit = useCreateWorkUnit(videoId)

  const handleAdd = () => {
    const lastUnit = workUnits?.[workUnits.length - 1]
    createWorkUnit.mutate({
      sequence: (lastUnit?.sequence ?? 0) + 1,
      title: "새 작업",
      startTime: lastUnit?.endTime ?? 0,
      endTime: (lastUnit?.endTime ?? 0) + 10,
    })
  }

  if (!video) return <p className="p-6 text-gray-500">불러오는 중...</p>

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4 truncate">{video.fileName}</h1>
      <div className="mb-6">
        <VideoPlayer filePath={video.filePath} />
      </div>
      <WorkUnitList
        workUnits={workUnits ?? []}
        onUpdate={(id, body) => updateWorkUnit.mutate({ id, body })}
        onDelete={(id) => deleteWorkUnit.mutate(id)}
        onAdd={handleAdd}
      />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/EditPage.tsx frontend/src/components/
git commit -m "feat: 작업 단위 편집 페이지 구현"
```

---

## Task 13: 최종 통합 테스트 및 실행 검증

**Files:**
- Modify: `backend/tests/test_api.py` (업로드 성공 케이스 추가)

- [ ] **Step 1: 백엔드 전체 테스트 실행**

```bash
cd backend
pytest tests/ -v
```

Expected: 모든 테스트 통과

- [ ] **Step 2: 백엔드 서버 실행**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Expected: `Uvicorn running on http://127.0.0.1:8000`

- [ ] **Step 3: 프론트엔드 서버 실행**

```bash
cd frontend
npm run dev
```

Expected: `Local: http://localhost:5173/`

- [ ] **Step 4: 수동 동작 확인**

브라우저에서 `http://localhost:5173` 접속:
1. 동영상 업로드 버튼 클릭 → mp4 파일 선택 → 카드 목록에 표시 확인
2. "분석 시작" 클릭 → 분석 진행 페이지로 이동 확인
3. 분석 완료 후 편집 페이지 자동 이동 확인
4. 작업 단위 수정/삭제/추가 동작 확인

- [ ] **Step 5: 최종 Commit**

```bash
git add .
git commit -m "feat: Process Maker 전체 구현 완료"
```

---

## 스펙 커버리지 체크

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| 동영상 업로드 (mp4/mov/avi) | Task 6 |
| FFmpeg 프레임 추출 | Task 3 |
| Claude Vision 프레임 분석 | Task 4 |
| 작업 단위 그루핑 | Task 5 |
| 비동기 백그라운드 분석 | Task 6 |
| AWS Secret Manager MySQL 연결 | Task 1 |
| 작업 단위 CRUD API | Task 6, 7 |
| 동영상 목록/업로드 UI | Task 10 |
| 분석 진행 상태 폴링 UI | Task 11 |
| 작업 단위 편집 UI (시간/설명/설비/자재) | Task 12 |
| 작업 단위 추가/삭제 | Task 12 |
