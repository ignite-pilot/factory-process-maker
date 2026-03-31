from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase


class Base(DeclarativeBase):
    pass


def createEngine(databaseUrl: str):
    return create_engine(databaseUrl, pool_pre_ping=True)


# 앱 실행 시 main.py에서 초기화
_engine = None
_SessionLocal = None


def initDb(databaseUrl: str):
    global _engine, _SessionLocal
    _engine = createEngine(databaseUrl)
    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def getDb():
    if _SessionLocal is None:
        raise RuntimeError("DB가 초기화되지 않았습니다. initDb()를 먼저 호출하세요.")
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()
