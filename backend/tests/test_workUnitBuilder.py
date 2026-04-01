import pytest
from app.services.workUnitBuilder import WorkUnitBuilder, _titleSimilarity, _jaccardSimilarity, _groupSimilarity
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
        makeResult(0.0, "볼트 조립"),
        makeResult(1.0, "볼트 조립"),
        makeResult(2.0, "볼트 조립"),
        makeResult(3.0, "도장"),
        makeResult(4.0, "도장"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    # 타이틀이 완전히 다르므로 2개
    assert len(units) == 2
    assert units[0]["title"] == "볼트 조립"
    assert units[1]["title"] == "도장"


def test_build_calculatesDuration():
    results = [
        makeResult(0.0, "볼트 조립"),
        makeResult(5.0, "볼트 조립"),
        makeResult(10.0, "도장"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert units[0]["startTime"] == 0.0
    assert units[0]["endTime"] == 5.0
    assert units[0]["duration"] == pytest.approx(5.0)


def test_build_mergesEquipmentsAndMaterials():
    results = [
        makeResult(0.0, "작업A", equipments=["드라이버"], materials=["볼트"]),
        makeResult(1.0, "작업A", equipments=["드라이버", "렌치"], materials=["너트"]),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert set(units[0]["equipments"]) == {"드라이버", "렌치"}
    assert set(units[0]["materials"]) == {"볼트", "너트"}


def test_build_assignsSequence():
    results = [
        makeResult(0.0, "부품 조립"),
        makeResult(1.0, "도장"),
        makeResult(2.0, "절삭"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert [u["sequence"] for u in units] == [1, 2, 3]


def test_build_returnsEmptyForEmptyInput():
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=[])
    assert units == []


def test_build_mergesSimilarAdjacentGroups():
    # "범퍼 조립"과 "범퍼 부품 조립"은 타이틀 유사도가 높아 병합되어야 함
    results = [
        makeResult(0.0, "범퍼 조립", equipments=["조립 지그"]),
        makeResult(1.0, "범퍼 조립", equipments=["조립 지그"]),
        makeResult(2.0, "범퍼 부품 조립", equipments=["조립 지그"]),
        makeResult(3.0, "범퍼 부품 조립", equipments=["조립 지그"]),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 1


def test_build_doesNotMergeDissimilarGroups():
    # "볼트 체결"과 "도장"은 유사도가 낮아 병합되지 않아야 함
    results = [
        makeResult(0.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]),
        makeResult(1.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]),
        makeResult(2.0, "도장", equipments=["스프레이건"], materials=["페인트"]),
        makeResult(3.0, "도장", equipments=["스프레이건"], materials=["페인트"]),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 2
    assert units[0]["title"] == "볼트 체결"
    assert units[1]["title"] == "도장"


def test_titleSimilarity_similarTitles():
    assert _titleSimilarity("범퍼 조립", "범퍼 부품 조립") > 0.6


def test_titleSimilarity_differentTitles():
    assert _titleSimilarity("볼트 체결", "도장") < 0.4


def test_jaccardSimilarity_overlapping():
    assert _jaccardSimilarity(["드라이버", "렌치"], ["드라이버", "해머"]) == pytest.approx(1 / 3)


def test_jaccardSimilarity_bothEmpty():
    assert _jaccardSimilarity([], []) == pytest.approx(1.0)


def test_jaccardSimilarity_oneEmpty():
    assert _jaccardSimilarity(["드라이버"], []) == pytest.approx(0.0)
