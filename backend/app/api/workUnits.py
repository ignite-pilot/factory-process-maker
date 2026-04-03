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
    workUnit = db.query(WorkUnit).filter(WorkUnit.id == workUnitId, WorkUnit.deletedYn == "N").first()
    if not workUnit:
        raise HTTPException(status_code=404, detail="작업 단위를 찾을 수 없습니다")
    workUnit.deletedYn = "Y"
    workUnit.updatedAt = datetime.utcnow()
    db.commit()
    return {"ok": True}
