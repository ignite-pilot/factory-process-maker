from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase


class Base(DeclarativeBase):
    pass


def createEngine(databaseUrl: str):
    return create_engine(databaseUrl, pool_pre_ping=True)


def getDb(engine):
    sessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = sessionLocal()
    try:
        yield db
    finally:
        db.close()
