import pytest
from app.services.workUnitBuilder import (
    WorkUnitBuilder,
    _titleSimilarity,
    _jaccardSimilarity,
    _groupSimilarity,
    _groupDuration,
    MIN_DURATION_SECONDS,
)
from app.services.claudeAnalyzer import FrameAnalysisResult


def makeResult(frameTime: float, title: str, equipments=None, materials=None) -> FrameAnalysisResult:
    return FrameAnalysisResult(
        frameTime=frameTime,
        title=title,
        description=f"{title} 설명",
        equipments=equipments or [],
        materials=materials or [],
    )


# ─── 기본 동작 ────────────────────────────────────────────────────────────────

def test_build_groupsConsecutiveSameTitle():
    # 각 그룹이 3초 이상이어야 분리됨 (0~3초 = "볼트 조립", 5~8초 = "도장")
    results = [
        makeResult(0.0, "볼트 조립"),
        makeResult(1.0, "볼트 조립"),
        makeResult(2.0, "볼트 조립"),
        makeResult(3.0, "볼트 조립"),
        makeResult(5.0, "도장"),
        makeResult(6.0, "도장"),
        makeResult(7.0, "도장"),
        makeResult(8.0, "도장"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 2
    assert units[0]["title"] == "볼트 조립"
    assert units[1]["title"] == "도장"


def test_build_calculatesDuration():
    results = [
        makeResult(0.0, "볼트 조립"),
        makeResult(1.0, "볼트 조립"),
        makeResult(2.0, "볼트 조립"),
        makeResult(5.0, "볼트 조립"),
        makeResult(10.0, "도장"),
        makeResult(11.0, "도장"),
        makeResult(12.0, "도장"),
        makeResult(13.0, "도장"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert units[0]["startTime"] == 0.0
    assert units[0]["endTime"] == 5.0
    assert units[0]["duration"] == pytest.approx(5.0)


def test_build_mergesEquipmentsAndMaterials():
    # 단일 그룹 (비교 대상 없음) — 설비·자재 병합만 확인
    results = [
        makeResult(0.0, "작업A", equipments=["드라이버"], materials=["볼트"]),
        makeResult(1.0, "작업A", equipments=["드라이버", "렌치"], materials=["너트"]),
        makeResult(2.0, "작업A", equipments=["렌치"], materials=["볼트"]),
        makeResult(3.0, "작업A", equipments=["드라이버"], materials=["너트"]),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert set(units[0]["equipments"]) == {"드라이버", "렌치"}
    assert set(units[0]["materials"]) == {"볼트", "너트"}


def test_build_assignsSequence():
    # 각 그룹 4프레임 이상으로 3초 보장
    results = [
        makeResult(0.0, "부품 조립"), makeResult(1.0, "부품 조립"),
        makeResult(2.0, "부품 조립"), makeResult(3.0, "부품 조립"),
        makeResult(5.0, "도장"),     makeResult(6.0, "도장"),
        makeResult(7.0, "도장"),     makeResult(8.0, "도장"),
        makeResult(10.0, "절삭"),    makeResult(11.0, "절삭"),
        makeResult(12.0, "절삭"),    makeResult(13.0, "절삭"),
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
    # 각 그룹 4프레임으로 3초 이상 확보 → 유사도 낮으면 분리 유지
    results = [
        makeResult(0.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]),
        makeResult(1.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]),
        makeResult(2.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]),
        makeResult(3.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]),
        makeResult(5.0, "도장", equipments=["스프레이건"], materials=["페인트"]),
        makeResult(6.0, "도장", equipments=["스프레이건"], materials=["페인트"]),
        makeResult(7.0, "도장", equipments=["스프레이건"], materials=["페인트"]),
        makeResult(8.0, "도장", equipments=["스프레이건"], materials=["페인트"]),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 2
    assert units[0]["title"] == "볼트 체결"
    assert units[1]["title"] == "도장"


# ─── 최소 3초 병합 (신규) ───────────────────────────────────────────────────

def test_build_mergesShortGroupWithNext():
    # "볼트 체결" 1프레임(0초 구간)이 3초 미만 → 인접한 "볼트 체결" 그룹과 병합
    results = [
        makeResult(0.0, "볼트 체결"),  # 짧은 그룹 (0초)
        makeResult(5.0, "볼트 체결"),
        makeResult(6.0, "볼트 체결"),
        makeResult(7.0, "볼트 체결"),
        makeResult(8.0, "볼트 체결"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 1
    assert units[0]["startTime"] == 0.0
    assert units[0]["endTime"] == 8.0


def test_build_shortGroupMergedWithMoreSimilarNeighbor():
    # 중간의 짧은 그룹(2초)이 앞 그룹과 더 유사하면 앞으로 병합
    results = [
        makeResult(0.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]),
        makeResult(1.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]),
        makeResult(2.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]),
        makeResult(3.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]),
        makeResult(5.0, "볼트 조임"),  # 짧은 그룹 (2초) — "볼트 체결"과 유사
        makeResult(7.0, "볼트 조임"),
        makeResult(10.0, "도장", equipments=["스프레이건"], materials=["페인트"]),
        makeResult(11.0, "도장", equipments=["스프레이건"], materials=["페인트"]),
        makeResult(12.0, "도장", equipments=["스프레이건"], materials=["페인트"]),
        makeResult(13.0, "도장", equipments=["스프레이건"], materials=["페인트"]),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    # 짧은 "볼트 조임"이 "볼트 체결"과 병합되어 총 2개
    assert len(units) == 2


def test_build_allShortGroupsMergedIntoOne():
    # 모든 프레임이 1초 간격인 짧은 그룹들 → 결국 하나로 합쳐짐
    results = [
        makeResult(0.0, "작업A"),
        makeResult(1.0, "작업B"),
        makeResult(2.0, "작업C"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    # 모두 < 3초이므로 차례로 병합되어 1개
    assert len(units) == 1


def test_build_singleFrameGroupMerged():
    # 1프레임짜리 그룹(duration=0)이 인접 그룹에 흡수되어야 함
    results = [
        makeResult(0.0, "도장"),
        makeResult(1.0, "이동"),      # 1프레임짜리 → 병합 대상
        makeResult(5.0, "도장"),
        makeResult(6.0, "도장"),
        makeResult(7.0, "도장"),
        makeResult(8.0, "도장"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    for unit in units:
        duration = unit["endTime"] - unit["startTime"]
        # 단일 그룹만 남은 경우 허용, 아니면 모두 3초 이상
        if len(units) > 1:
            assert duration >= MIN_DURATION_SECONDS


def test_build_minimumDurationRespected():
    # 3초 이상 그룹은 병합되지 않고 유지
    results = [
        makeResult(0.0, "볼트 체결"),
        makeResult(1.0, "볼트 체결"),
        makeResult(2.0, "볼트 체결"),
        makeResult(3.0, "볼트 체결"),  # duration=3.0 → 유지
        makeResult(5.0, "도장"),
        makeResult(6.0, "도장"),
        makeResult(7.0, "도장"),
        makeResult(8.0, "도장"),       # duration=3.0 → 유지
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 2
    for unit in units:
        assert unit["endTime"] - unit["startTime"] >= MIN_DURATION_SECONDS


# ─── 유틸리티 함수 ─────────────────────────────────────────────────────────

def test_groupDuration_singleFrame():
    group = [makeResult(5.0, "작업")]
    assert _groupDuration(group) == 0.0


def test_groupDuration_multipleFrames():
    group = [makeResult(2.0, "작업"), makeResult(5.0, "작업"), makeResult(8.0, "작업")]
    assert _groupDuration(group) == pytest.approx(6.0)


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
