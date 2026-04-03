import pytest
from app.services.workUnitBuilder import (
    WorkUnitBuilder,
    _titleSimilarity,
    _jaccardSimilarity,
    _groupSimilarity,
    _groupDuration,
    _synonymKey,
    _extractMainMaterial,
    _extractBaseVerb,
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


def makeGroup(startTime: float, title: str, count: int = 6, **kwargs) -> list:
    """MIN_DURATION(5초) 이상인 그룹 생성 헬퍼 (기본 6프레임, duration=5.0)"""
    return [makeResult(startTime + i, title, **kwargs) for i in range(count)]


# ─── 기본 동작 ────────────────────────────────────────────────────────────────

def test_build_groupsConsecutiveSameTitle():
    # 각 그룹이 5초 이상이어야 분리됨
    results = (
        makeGroup(0.0, "볼트 조립") +
        makeGroup(10.0, "도장")
    )
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 2
    assert units[0]["title"] == "볼트 조립"
    assert units[1]["title"] == "도장"


def test_build_calculatesDuration():
    results = (
        makeGroup(0.0, "볼트 조립") +
        makeGroup(10.0, "도장")
    )
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
    # 각 그룹 5초 이상 확보
    results = (
        makeGroup(0.0, "부품 조립") +
        makeGroup(10.0, "도장") +
        makeGroup(20.0, "절삭")
    )
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
    # 각 그룹 5초 이상 확보 → 유사도 낮으면 분리 유지
    results = (
        makeGroup(0.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]) +
        makeGroup(10.0, "도장", equipments=["스프레이건"], materials=["페인트"])
    )
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 2
    assert units[0]["title"] == "볼트 체결"
    assert units[1]["title"] == "도장"


# ─── 최소 5초 병합 ───────────────────────────────────────────────────

def test_build_mergesShortGroupWithNext():
    # "볼트 체결" 1프레임(0초 구간)이 5초 미만 → 인접한 "볼트 체결" 그룹과 병합
    results = [
        makeResult(0.0, "볼트 체결"),  # 짧은 그룹 (0초)
    ] + makeGroup(5.0, "볼트 체결")
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 1
    assert units[0]["startTime"] == 0.0
    assert units[0]["endTime"] == 10.0


def test_build_shortGroupMergedWithMoreSimilarNeighbor():
    # 중간의 짧은 그룹(2초)이 앞 그룹과 더 유사하면 앞으로 병합
    results = (
        makeGroup(0.0, "조립", equipments=["조립 지그"], materials=["범퍼"]) +
        [makeResult(8.0, "검사"), makeResult(9.0, "검사")] +   # 짧은 그룹 (1초)
        makeGroup(15.0, "도장", equipments=["스프레이건"], materials=["페인트"])
    )
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    # 짧은 "검사"가 인접 그룹 중 하나에 흡수되어 총 2개
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
    assert len(units) == 1


def test_build_singleFrameGroupMerged():
    # 1프레임짜리 그룹(duration=0)이 인접 그룹에 흡수되어야 함
    results = [
        makeResult(0.0, "도장"),
        makeResult(1.0, "이동"),      # 1프레임짜리 → 병합 대상
    ] + makeGroup(5.0, "도장")
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    for unit in units:
        duration = unit["endTime"] - unit["startTime"]
        if len(units) > 1:
            assert duration >= MIN_DURATION_SECONDS


def test_build_minimumDurationRespected():
    # 5초 이상 그룹은 병합되지 않고 유지
    results = (
        makeGroup(0.0, "볼트 체결", equipments=["전동드라이버"], materials=["볼트"]) +
        makeGroup(10.0, "도장", equipments=["스프레이건"], materials=["페인트"])
    )
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


# ─── 유의어 병합 ────────────────────────────────────────────────────────────────

def test_synonymKey_returnsSameKeyForSynonyms():
    assert _synonymKey("부품 취출") == _synonymKey("부품 선택")
    assert _synonymKey("부품 준비") == _synonymKey("부품 픽업")

def test_synonymKey_returnsSelfForUnknown():
    assert _synonymKey("용접") == "용접"

def test_titleSimilarity_synonymsAreFullScore():
    assert _titleSimilarity("부품 취출", "부품 선택") == pytest.approx(1.0)
    assert _titleSimilarity("부품 준비", "소재 준비") == pytest.approx(1.0)

def test_build_mergesSynonymTitlesInSameGroup():
    # "부품 취출"과 "부품 선택"은 유의어 → 같은 그룹으로 묶여야 함 (5초 이상 유지)
    results = (
        [
            makeResult(0.0, "부품 준비"),
            makeResult(1.0, "부품 취출"),
            makeResult(2.0, "부품 선택"),
            makeResult(3.0, "부품 준비"),
            makeResult(4.0, "부품 취출"),
            makeResult(5.0, "부품 선택"),
        ] +
        makeGroup(10.0, "도장")
    )
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 2
    assert units[1]["title"] == "도장"


# ─── 동사 기반 병합 ─────────────────────────────────────────────────────────────

def test_extractBaseVerb_withPartName():
    assert _extractBaseVerb("리어 범퍼 조립") == "조립"
    assert _extractBaseVerb("도어 패널 검사") == "검사"

def test_extractBaseVerb_verbOnly():
    assert _extractBaseVerb("조립") == "조립"
    assert _extractBaseVerb("운반") == "운반"

def test_extractBaseVerb_unknown():
    assert _extractBaseVerb("도장") == "도장"

def test_titleSimilarity_sameBaseVerbHighScore():
    # 부품명이 달라도 동사가 같으면 0.85 이상
    assert _titleSimilarity("리어 범퍼 조립", "도어 패널 조립") == pytest.approx(0.85)
    assert _titleSimilarity("리어 범퍼 검사", "프론트 범퍼 검사") == pytest.approx(0.85)

def test_build_mergesSameVerbGroups():
    # "리어 범퍼 조립"과 "도어 패널 조립"은 동사(조립)가 같아 병합되어야 함
    results = [
        makeResult(0.0, "리어 범퍼 조립"),
        makeResult(1.0, "리어 범퍼 조립"),
        makeResult(2.0, "도어 패널 조립"),
        makeResult(3.0, "도어 패널 조립"),
    ]
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    assert len(units) == 1


# ─── 중복 타이틀 구분 ────────────────────────────────────────────────────────────

def test_extractMainMaterial_returnsShortestCandidate():
    materials = ["자동차 범퍼 프레임", "리어 범퍼", "클립"]
    result = _extractMainMaterial(materials)
    assert result == "클립"

def test_extractMainMaterial_emptyReturnsEmpty():
    assert _extractMainMaterial([]) == ""

def test_build_disambiguatesDuplicateTitles():
    # 동일 타이틀 "조립"이 두 번 등장 → 자재로 구분
    results = (
        makeGroup(0.0, "조립", materials=["리어 범퍼"]) +
        makeGroup(10.0, "도장") +
        makeGroup(20.0, "조립", materials=["도어 패널"])
    )
    builder = WorkUnitBuilder()
    units = builder.build(frameResults=results)
    titles = [u["title"] for u in units]
    assembly_titles = [t for t in titles if "조립" in t]
    assert len(assembly_titles) == 2
    assert assembly_titles[0] != assembly_titles[1]
