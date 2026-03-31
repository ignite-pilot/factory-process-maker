from datetime import datetime
from sqlalchemy import BigInteger, Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

# SQLite 호환을 위해 BigInteger를 Integer로 폴백하는 타입
bigIntType = BigInteger().with_variant(Integer, "sqlite")


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(bigIntType, primary_key=True, autoincrement=True)
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

    id: Mapped[int] = mapped_column(bigIntType, primary_key=True, autoincrement=True)
    videoId: Mapped[int] = mapped_column(bigIntType, ForeignKey("videos.id"))
    status: Mapped[str] = mapped_column(
        Enum("queued", "running", "completed", "failed"), default="queued"
    )
    startedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completedAt: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    video: Mapped["Video"] = relationship(back_populates="analysisJobs")


class WorkUnit(Base):
    __tablename__ = "work_units"

    id: Mapped[int] = mapped_column(bigIntType, primary_key=True, autoincrement=True)
    videoId: Mapped[int] = mapped_column(bigIntType, ForeignKey("videos.id"))
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

    id: Mapped[int] = mapped_column(bigIntType, primary_key=True, autoincrement=True)
    workUnitId: Mapped[int] = mapped_column(bigIntType, ForeignKey("work_units.id"))
    frameTime: Mapped[float] = mapped_column(Float)
    imagePath: Mapped[str] = mapped_column(String(500))

    workUnit: Mapped["WorkUnit"] = relationship(back_populates="frames")
