from datetime import datetime
from pydantic import BaseModel


class VideoResponse(BaseModel):
    id: int
    fileName: str
    filePath: str
    duration: float | None
    status: str
    createdAt: datetime
    workUnitCount: int = 0

    model_config = {"from_attributes": True}


class AnalysisJobResponse(BaseModel):
    id: int
    videoId: int
    status: str
    startedAt: datetime | None
    completedAt: datetime | None
    currentStep: str | None = None
    totalFrames: int | None = None
    processedFrames: int | None = None
    estimatedSecondsLeft: float | None = None

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
