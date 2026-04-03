from difflib import SequenceMatcher
from app.services.claudeAnalyzer import FrameAnalysisResult

SIMILARITY_THRESHOLD = 0.55
MIN_DURATION_SECONDS = 5.0

# 동사 카테고리 — 같은 카테고리면 부품명이 달라도 높은 유사도
BASE_VERBS = ["조립", "검사", "운반", "부품 준비", "체결", "적재", "이동"]

# 동일한 의미로 취급할 유의어 그룹
SYNONYM_GROUPS: list[set[str]] = [
    {"부품 준비", "부품 취출", "부품 선택", "부품 픽업", "소재 준비", "자재 준비"},
    {"운반", "부품 운반", "이동", "작업 이동", "공정 이동"},
    {"검사", "부품 검사", "외관 검사", "품질 검사"},
    {"적재", "부품 적재", "완제품 적재"},
    {"체결", "볼트 체결", "너트 체결", "클립 체결"},
]


def _synonymKey(title: str) -> str:
    """유의어 그룹 내 대표 타이틀 반환. 해당 없으면 원본 반환."""
    for group in SYNONYM_GROUPS:
        if title in group:
            return min(group)  # 정렬상 첫 번째를 대표키로
    return title


def _extractBaseVerb(title: str) -> str:
    """타이틀에서 동사 부분 추출. 예: '리어 범퍼 조립' → '조립'"""
    for verb in BASE_VERBS:
        if title == verb or title.endswith(verb):
            return verb
    return title


def _titleSimilarity(a: str, b: str) -> float:
    if _synonymKey(a) == _synonymKey(b):
        return 1.0
    verbA = _extractBaseVerb(a)
    verbB = _extractBaseVerb(b)
    if verbA == verbB and verbA in BASE_VERBS:
        return 0.85
    return SequenceMatcher(None, a, b).ratio()


def _jaccardSimilarity(a: list[str], b: list[str]) -> float:
    setA, setB = set(a), set(b)
    if not setA and not setB:
        return 1.0
    if not setA or not setB:
        return 0.0
    return len(setA & setB) / len(setA | setB)


def _groupDuration(group: list[FrameAnalysisResult]) -> float:
    if len(group) < 2:
        return 0.0
    return group[-1].frameTime - group[0].frameTime


def _groupSimilarity(groupA: list[FrameAnalysisResult], groupB: list[FrameAnalysisResult]) -> float:
    titleA = groupA[0].title
    titleB = groupB[0].title

    equipmentsA = list({e for r in groupA for e in r.equipments})
    equipmentsB = list({e for r in groupB for e in r.equipments})
    materialsA = list({m for r in groupA for m in r.materials})
    materialsB = list({m for r in groupB for m in r.materials})

    titleScore = _titleSimilarity(titleA, titleB)
    equipmentScore = _jaccardSimilarity(equipmentsA, equipmentsB)
    materialScore = _jaccardSimilarity(materialsA, materialsB)

    return titleScore * 0.6 + equipmentScore * 0.2 + materialScore * 0.2


def _extractMainMaterial(materials: list[str]) -> str:
    """자재 목록에서 가장 짧고 구체적인 핵심 부품명 추출."""
    if not materials:
        return ""
    candidates = sorted(materials, key=lambda m: len(m))
    for m in candidates:
        if 2 <= len(m) <= 10:
            return m
    return candidates[0]


class WorkUnitBuilder:
    def build(self, frameResults: list[FrameAnalysisResult]) -> list[dict]:
        if not frameResults:
            return []

        # 1단계: 연속된 동일 타이틀(유의어 포함) 그룹핑
        groups: list[list[FrameAnalysisResult]] = []
        currentGroup: list[FrameAnalysisResult] = [frameResults[0]]

        for result in frameResults[1:]:
            if _synonymKey(result.title) == _synonymKey(currentGroup[-1].title):
                currentGroup.append(result)
            else:
                groups.append(currentGroup)
                currentGroup = [result]
        groups.append(currentGroup)

        # 2단계: 유사도 기반 인접 그룹 병합
        groups = self._mergeSimilarGroups(groups)

        # 3단계: 최소 3초 미만 그룹 인접 병합
        groups = self._mergeShortGroups(groups)

        units = [self._groupToUnit(g, i + 1) for i, g in enumerate(groups)]

        # 4단계: 중복 타이틀 자재 기반 구분
        units = self._disambiguateTitles(units)

        return units

    def _mergeSimilarGroups(self, groups: list[list[FrameAnalysisResult]]) -> list[list[FrameAnalysisResult]]:
        if len(groups) <= 1:
            return groups

        merged = [groups[0]]
        for group in groups[1:]:
            similarity = _groupSimilarity(merged[-1], group)
            if similarity >= SIMILARITY_THRESHOLD:
                merged[-1] = merged[-1] + group
            else:
                merged.append(group)
        return merged

    def _mergeShortGroups(self, groups: list[list[FrameAnalysisResult]]) -> list[list[FrameAnalysisResult]]:
        """3초 미만 그룹을 더 유사한 인접 그룹과 반복 병합"""
        if len(groups) <= 1:
            return groups

        changed = True
        while changed:
            changed = False
            for i in range(len(groups)):
                if _groupDuration(groups[i]) >= MIN_DURATION_SECONDS:
                    continue
                if len(groups) == 1:
                    break

                if i == 0:
                    mergeWith = 1
                elif i == len(groups) - 1:
                    mergeWith = i - 1
                else:
                    simPrev = _groupSimilarity(groups[i - 1], groups[i])
                    simNext = _groupSimilarity(groups[i], groups[i + 1])
                    mergeWith = i - 1 if simPrev >= simNext else i + 1

                lo, hi = min(i, mergeWith), max(i, mergeWith)
                merged = groups[lo] + groups[hi]
                groups = groups[:lo] + [merged] + groups[hi + 1:]
                changed = True
                break

        return groups

    def _groupToUnit(self, group: list[FrameAnalysisResult], sequence: int) -> dict:
        allEquipments = set()
        allMaterials = set()
        descriptions = []

        for r in group:
            allEquipments.update(r.equipments)
            allMaterials.update(r.materials)
            if r.description:
                descriptions.append(r.description)

        # 유의어면 그룹 내 가장 많이 등장한 타이틀로 대표 타이틀 결정
        titleCounts: dict[str, int] = {}
        for r in group:
            titleCounts[r.title] = titleCounts.get(r.title, 0) + 1
        representativeTitle = max(titleCounts, key=lambda t: titleCounts[t])

        startTime = group[0].frameTime
        endTime = group[-1].frameTime
        return {
            "sequence": sequence,
            "title": representativeTitle,
            "startTime": startTime,
            "endTime": endTime,
            "duration": endTime - startTime,
            "description": descriptions[0] if descriptions else "",
            "equipments": list(allEquipments),
            "materials": list(allMaterials),
            "startFrame": round(startTime),
            "endFrame": round(endTime),
        }

    def _disambiguateTitles(self, units: list[dict]) -> list[dict]:
        """동일 타이틀이 여러 작업에 있을 때 자재 기반으로 구분."""
        titleCount: dict[str, int] = {}
        for u in units:
            titleCount[u["title"]] = titleCount.get(u["title"], 0) + 1

        duplicates = {t for t, c in titleCount.items() if c > 1}
        if not duplicates:
            return units

        for u in units:
            if u["title"] not in duplicates:
                continue
            mainMaterial = _extractMainMaterial(u["materials"])
            if mainMaterial and mainMaterial not in u["title"]:
                u["title"] = f"{mainMaterial} {u['title']}"

        return units
