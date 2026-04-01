import os
import shutil
import time
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

_progressStore: dict[int, dict] = {}


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
def startAnalysis(videoId: int, backgroundTasks: BackgroundTasks, db: Session = Depends(getDb)):
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

    backgroundTasks.add_task(runAnalysis, jobId=job.id, videoId=videoId)
    return AnalysisJobResponse(
        id=job.id,
        videoId=job.videoId,
        status=job.status,
        startedAt=job.startedAt,
        completedAt=job.completedAt,
    )


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

    progress = _progressStore.get(job.id, {})
    processedFrames = progress.get("processedFrames", 0)
    totalFrames = progress.get("totalFrames", 0)
    analyzingStartedAt = progress.get("analyzingStartedAt")

    estimatedSecondsLeft = None
    if analyzingStartedAt and processedFrames > 0 and totalFrames > processedFrames:
        elapsed = time.time() - analyzingStartedAt
        rate = processedFrames / elapsed
        remaining = totalFrames - processedFrames
        estimatedSecondsLeft = remaining / rate

    return AnalysisJobResponse(
        id=job.id,
        videoId=job.videoId,
        status=job.status,
        startedAt=job.startedAt,
        completedAt=job.completedAt,
        currentStep=progress.get("currentStep"),
        totalFrames=totalFrames or None,
        processedFrames=processedFrames or None,
        estimatedSecondsLeft=estimatedSecondsLeft,
    )


@router.get("/videos/{videoId}/work-units", response_model=list[WorkUnitResponse])
def listWorkUnits(videoId: int, db: Session = Depends(getDb)):
    return (
        db.query(WorkUnit)
        .filter(WorkUnit.videoId == videoId)
        .order_by(WorkUnit.sequence)
        .all()
    )


def runAnalysis(jobId: int, videoId: int):
    from app.core.database import _SessionLocal
    db = _SessionLocal()
    try:
        job = db.get(AnalysisJob, jobId)
        video = db.get(Video, videoId)
        job.status = "running"
        job.startedAt = datetime.utcnow()
        db.commit()

        _progressStore[jobId] = {
            "currentStep": "extracting",
            "totalFrames": 0,
            "processedFrames": 0,
            "analyzingStartedAt": None,
        }

        extractor = FrameExtractor(videoId=videoId, videoPath=video.filePath)
        duration = extractor.getVideoDuration()
        video.duration = duration
        db.commit()

        framePaths = extractor.extractFrames(intervalSeconds=1)

        _progressStore[jobId]["totalFrames"] = len(framePaths)
        _progressStore[jobId]["currentStep"] = "analyzing"
        _progressStore[jobId]["analyzingStartedAt"] = time.time()

        analyzer = ClaudeAnalyzer()
        frameResults = []
        for i, framePath in enumerate(framePaths):
            frameTime = float(i)
            result = analyzer.analyzeFrame(framePath=framePath, frameTime=frameTime)
            frameResults.append(result)
            _progressStore[jobId]["processedFrames"] = i + 1

        _progressStore[jobId]["currentStep"] = "building"

        builder = WorkUnitBuilder()
        unitDicts = builder.build(frameResults=frameResults)

        for unitDict in unitDicts:
            workUnit = WorkUnit(videoId=videoId, **unitDict)
            db.add(workUnit)
            db.flush()

            midIdx = min(round((unitDict["startFrame"] + unitDict["endFrame"]) / 2), len(framePaths) - 1)
            midFrame = framePaths[midIdx]
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
        import traceback
        traceback.print_exc()
    finally:
        _progressStore.pop(jobId, None)
        db.close()
