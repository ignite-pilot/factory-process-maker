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


def test_build_returnsEmptyForEmptyInput():
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=[])
    assert units == []
