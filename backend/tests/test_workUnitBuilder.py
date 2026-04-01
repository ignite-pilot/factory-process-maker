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
    # 각 그룹이 MIN_DURATION_SECONDS(10초) 이상이 되도록 설정
    results = [makeResult(float(i), "볼트 조립") for i in range(15)]
    results += [makeResult(float(i + 15), "검사") for i in range(15)]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 2
    assert units[0]["title"] == "볼트 조립"
    assert units[1]["title"] == "검사"


def test_build_calculatesDuration():
    results = [makeResult(float(i), "작업A") for i in range(15)]
    results += [makeResult(float(i + 15), "작업B") for i in range(15)]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert units[0]["duration"] == pytest.approx(14.0)
    assert units[0]["startTime"] == 0.0
    assert units[0]["endTime"] == 14.0


def test_build_mergesEquipmentsAndMaterials():
    results = [
        makeResult(float(i), "작업A", equipments=["드라이버"], materials=["볼트"]) for i in range(8)
    ] + [
        makeResult(float(i + 8), "작업A", equipments=["드라이버", "렌치"], materials=["너트"]) for i in range(8)
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert set(units[0]["equipments"]) == {"드라이버", "렌치"}
    assert set(units[0]["materials"]) == {"볼트", "너트"}


def test_build_assignsSequence():
    results = (
        [makeResult(float(i), "작업A") for i in range(15)]
        + [makeResult(float(i + 15), "작업B") for i in range(15)]
        + [makeResult(float(i + 30), "작업C") for i in range(15)]
    )
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert [u["sequence"] for u in units] == [1, 2, 3]


def test_build_returnsEmptyForEmptyInput():
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=[])
    assert units == []


def test_build_mergesShortGroupIntoPrevious():
    # 짧은 그룹(5초)은 이전 그룹에 병합되어야 함
    results = (
        [makeResult(float(i), "볼트 조립") for i in range(15)]
        + [makeResult(float(i + 15), "이동") for i in range(5)]   # 5초 → 병합 대상
        + [makeResult(float(i + 20), "검사") for i in range(15)]
    )
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    # "이동"(5초)이 이전 "볼트 조립"에 병합되어 총 2개
    assert len(units) == 2
    assert units[0]["title"] == "볼트 조립"
    assert units[1]["title"] == "검사"


def test_build_mergesAdjacentSameTitleAfterShortGroup():
    # A(긴) → B(짧음, 병합됨) → A(긴) 패턴에서 최종적으로 A 하나로 합쳐져야 함
    results = (
        [makeResult(float(i), "부품 조립") for i in range(15)]
        + [makeResult(float(i + 15), "이동") for i in range(5)]   # 짧은 그룹
        + [makeResult(float(i + 20), "부품 조립") for i in range(15)]
    )
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    titles = [u["title"] for u in units]
    # "이동"이 병합된 후 인접한 "부품 조립"끼리 합쳐져 1개
    assert len(units) == 1
    assert units[0]["title"] == "부품 조립"
