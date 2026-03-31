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
    from app.core.database import createEngine, getDb
    engine = createEngine("sqlite:///:memory:")
    generator = getDb(engine)
    db = next(generator)
    assert db is not None
    # 세션 종료
    try:
        next(generator)
    except StopIteration:
        pass


def test_getDbClosesSessionAfterUse():
    """getDb가 사용 후 세션을 닫는다."""
    from app.core.database import createEngine, getDb
    engine = createEngine("sqlite:///:memory:")
    generator = getDb(engine)
    db = next(generator)
    # 세션이 활성 상태인지 확인
    assert db.is_active
    # 제너레이터 종료 (finally 블록 실행)
    try:
        next(generator)
    except StopIteration:
        pass
    # 세션이 닫혔는지 확인
    assert not db.is_active


def test_baseIsDeclarativeBase():
    """Base가 DeclarativeBase의 서브클래스이다."""
    from app.core.database import Base
    from sqlalchemy.orm import DeclarativeBase
    assert issubclass(Base, DeclarativeBase)
