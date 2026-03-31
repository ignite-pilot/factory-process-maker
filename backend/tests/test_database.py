import pytest
from unittest.mock import MagicMock, patch


def test_createEngineDoesNotConnectOnImport():
    """database 모듈 임포트 시 AWS 연결이 발생하지 않는다."""
    # 단순히 임포트가 성공하면 통과 (AWS 연결 없이)
    import app.core.database as dbModule
    assert hasattr(dbModule, "createEngine")
    assert hasattr(dbModule, "getDb")
    assert hasattr(dbModule, "Base")


def test_createEngineReturnsEngine():
    """createEngine이 SQLAlchemy 엔진을 반환한다."""
    from app.core.database import createEngine
    engine = createEngine("sqlite:///:memory:")
    assert engine is not None


def test_getDbYieldsSession():
    """getDb 제너레이터가 DB 세션을 yield한다."""
    from app.core.database import initDb, getDb
    initDb("sqlite:///:memory:")
    generator = getDb()
    db = next(generator)
    assert db is not None
    # 세션 종료
    try:
        next(generator)
    except StopIteration:
        pass


def test_getDbClosesSessionAfterUse():
    """getDb가 사용 후 세션을 닫는다."""
    from unittest.mock import patch, MagicMock
    from sqlalchemy.orm import sessionmaker
    from app.core.database import initDb, getDb

    initDb("sqlite:///:memory:")

    mockDb = MagicMock()
    mockSessionLocal = MagicMock(return_value=mockDb)

    import app.core.database as dbModule
    original = dbModule._SessionLocal
    dbModule._SessionLocal = mockSessionLocal

    try:
        generator = getDb()
        db = next(generator)
        assert db is mockDb
        # 제너레이터 종료 (finally 블록 실행)
        try:
            next(generator)
        except StopIteration:
            pass
        # close()가 호출됐는지 확인
        mockDb.close.assert_called_once()
    finally:
        dbModule._SessionLocal = original


def test_baseIsDeclarativeBase():
    """Base가 DeclarativeBase의 서브클래스이다."""
    from app.core.database import Base
    from sqlalchemy.orm import DeclarativeBase
    assert issubclass(Base, DeclarativeBase)
